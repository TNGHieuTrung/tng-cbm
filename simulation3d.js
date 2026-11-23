// ===== 3D Container Loading Simulation (Three.js) =====
class ContainerSimulation {
    constructor(canvasId, viewportId) {
        this.canvas = document.getElementById(canvasId);
        this.viewport = document.getElementById(viewportId);
        if (!this.canvas || !this.viewport) return;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.container3D = null;
        this.cargoGroup = null;
        this.placedBoxes = [];
        this.boxMeshes = [];
        this.currentStep = 0;
        this.totalSteps = 0;
        this.isPlaying = false;
        this.playSpeed = 1;
        this.playInterval = null;
        this.cogMarker = null;
        this.showCog = true;
        this.selectedMesh = null;
        this.hoveredMesh = null;
        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2();
        this.onStepChange = null;
        this.onBoxSelect = null;
        this.viewMode = 'realistic'; // operational, realistic, xray
        this.heightCut = 1.0;
        this.isAnimating = false;

        // Container specs (meters)
        this.containerSpecs = {
            '20dc': { l: 5.898, w: 2.352, h: 2.393, name: "20' Dry Container (20DC)", payload: 28200 },
            '40dc': { l: 12.032, w: 2.352, h: 2.393, name: "40' Dry Container (40DC)", payload: 26680 },
            '40hc': { l: 12.032, w: 2.352, h: 2.698, name: "40' High Cube (40HC)", payload: 26460 },
            'truck': { l: 13.6, w: 2.48, h: 2.7, name: "Xe tải / Truck", payload: 24000 },
            'custom': { l: 6.0, w: 2.4, h: 2.4, name: "Tùy chỉnh / Custom", payload: 20000 }
        };

        this.currentEquipment = '20dc';
        this.scale = 40; // 1m = 40 units in scene

        this.init();
    }

    init() {
        const w = this.viewport.clientWidth;
        const h = this.viewport.clientHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a1628);
        this.scene.fog = new THREE.Fog(0x0a1628, 500, 1200);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
        this.camera.position.set(200, 150, 300);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Controls
        if (typeof THREE.OrbitControls !== 'undefined') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.08;
            this.controls.minDistance = 50;
            this.controls.maxDistance = 800;
            this.controls.target.set(0, 40, 0);
        }

        // Lighting
        this.setupLighting();

        // Floor grid
        this.setupFloor();

        // Build container
        this.buildContainer();

        // Setup 3D Raycasting & Box selection
        this.setupRaycaster();

        // Start render loop
        this.animate();

        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0x4466aa, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(100, 200, 150);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 500;
        dirLight.shadow.camera.left = -200;
        dirLight.shadow.camera.right = 200;
        dirLight.shadow.camera.top = 200;
        dirLight.shadow.camera.bottom = -200;
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x88aaff, 0.3);
        fillLight.position.set(-100, 100, -100);
        this.scene.add(fillLight);

        // Soft hemisphere light
        const hemiLight = new THREE.HemisphereLight(0x88aaff, 0x002244, 0.4);
        this.scene.add(hemiLight);
    }

    setupFloor() {
        // Ground plane
        const groundGeo = new THREE.PlaneGeometry(800, 800);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x0d1f33 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.5;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Grid
        const gridHelper = new THREE.GridHelper(600, 30, 0x1a3050, 0x0f2238);
        gridHelper.position.y = -0.4;
        this.scene.add(gridHelper);
    }

    buildContainer() {
        if (this.container3D) {
            this.scene.remove(this.container3D);
        }
        this.container3D = new THREE.Group();

        const spec = this.containerSpecs[this.currentEquipment];
        const s = this.scale;
        const L = spec.l * s, W = spec.w * s, H = spec.h * s;

        // Floor
        const floorGeo = new THREE.BoxGeometry(L, 1, W);
        const floorMat = new THREE.MeshLambertMaterial({ color: 0x3d3832 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.position.set(L / 2, -0.5, 0);
        floor.receiveShadow = true;
        this.container3D.add(floor);

        // Container walls (wireframe + solid)
        this.buildWalls(L, W, H);

        // Container ridges/corrugation on walls
        this.addContainerDetails(L, W, H);

        this.scene.add(this.container3D);

        // Update camera target
        if (this.controls) {
            this.controls.target.set(L / 2, H / 2.5, 0);
            this.controls.update();
        }
        this.camera.position.set(L * 1.2, H * 1.5, L * 0.8);
    }

    buildWalls(L, W, H) {
        const wallOpacity = this.viewMode === 'xray' ? 0.08 : (this.viewMode === 'operational' ? 0.12 : 0.22);
        const wallColor = this.viewMode === 'xray' ? 0x00e5ff : 0x3b82f6;

        // Wall material
        const wallMat = new THREE.MeshLambertMaterial({
            color: wallColor,
            transparent: true,
            opacity: wallOpacity,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        // Wireframe material
        const wireMat = new THREE.LineBasicMaterial({
            color: this.viewMode === 'xray' ? 0x00e5ff : 0x06b6d4,
            transparent: true,
            opacity: 0.75
        });

        // Left wall
        const leftWallGeo = new THREE.PlaneGeometry(L, H);
        const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
        leftWall.position.set(L / 2, H / 2, -W / 2);
        this.container3D.add(leftWall);

        // Right wall
        const rightWall = new THREE.Mesh(leftWallGeo, wallMat);
        rightWall.position.set(L / 2, H / 2, W / 2);
        this.container3D.add(rightWall);

        // Ceiling
        const ceilGeo = new THREE.PlaneGeometry(L, W);
        const ceil = new THREE.Mesh(ceilGeo, wallMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set(L / 2, H, 0);
        this.container3D.add(ceil);

        // Back wall
        const backWallGeo = new THREE.PlaneGeometry(W, H);
        const backWall = new THREE.Mesh(backWallGeo, wallMat);
        backWall.rotation.y = Math.PI / 2;
        backWall.position.set(0, H / 2, 0);
        this.container3D.add(backWall);

        // Wireframe box edges
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(L, H, W));
        const wireframe = new THREE.LineSegments(edges, wireMat);
        wireframe.position.set(L / 2, H / 2, 0);
        this.container3D.add(wireframe);

        // Door frame (open doors at x = L)
        this.buildDoors(L, W, H);
    }

    buildDoors(L, W, H) {
        const doorMat = new THREE.MeshLambertMaterial({
            color: 0x2563eb,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide
        });

        // Left door (open 90 degrees outward)
        const doorGeo = new THREE.PlaneGeometry(W / 2 - 2, H - 4);

        const leftDoor = new THREE.Mesh(doorGeo, doorMat);
        leftDoor.position.set(L + W / 4, H / 2, -W / 4);
        leftDoor.rotation.y = Math.PI / 2;
        this.container3D.add(leftDoor);

        const rightDoor = new THREE.Mesh(doorGeo, doorMat);
        rightDoor.position.set(L + W / 4, H / 2, W / 4);
        rightDoor.rotation.y = Math.PI / 2;
        this.container3D.add(rightDoor);

        // Door hinges (vertical bars)
        const hingeGeo = new THREE.CylinderGeometry(0.5, 0.5, H, 8);
        const hingeMat = new THREE.MeshLambertMaterial({ color: 0x06b6d4 });

        const hinge1 = new THREE.Mesh(hingeGeo, hingeMat);
        hinge1.position.set(L, H / 2, -W / 2 + 1);
        this.container3D.add(hinge1);

        const hinge2 = new THREE.Mesh(hingeGeo, hingeMat);
        hinge2.position.set(L, H / 2, W / 2 - 1);
        this.container3D.add(hinge2);
    }

    addContainerDetails(L, W, H) {
        // Corrugation ridges on side walls
        const ridgeMat = new THREE.MeshLambertMaterial({
            color: 0x06b6d4,
            transparent: true,
            opacity: this.viewMode === 'xray' ? 0.05 : 0.25
        });

        for (let x = 6; x < L - 4; x += 10) {
            const ridgeGeo = new THREE.BoxGeometry(1.2, H * 0.9, 0.5);
            const ridge1 = new THREE.Mesh(ridgeGeo, ridgeMat);
            ridge1.position.set(x, H * 0.45, -W / 2 - 0.3);
            this.container3D.add(ridge1);

            const ridge2 = new THREE.Mesh(ridgeGeo, ridgeMat);
            ridge2.position.set(x, H * 0.45, W / 2 + 0.3);
            this.container3D.add(ridge2);
        }
    }

    // ===== High-Precision 3D Bin-Packing Algorithm with Orientation, Sequential SKU Packing & Seamless Interlocking ("Gối đầu") =====
    packCargo(cargoItems, algorithm = 'best-balance') {
        this.clearCargo();

        const spec = this.containerSpecs[this.currentEquipment];
        const s = this.scale;
        const CL = spec.l, CW = spec.w, CH = spec.h;

        this.cargoGroup = new THREE.Group();
        this.placedBoxes = [];
        this.boxMeshes = [];

        let totalRequested = 0;
        let totalPlaced = 0;
        let totalPlacedVolume = 0;
        let totalPlacedWeight = 0;

        let cogSumX = 0;
        let cogSumY = 0;
        let cogSumZ = 0;

        // Sort items for sequential loading based on algorithm & logistics rules
        const itemsCopy = cargoItems.map(item => ({ ...item }));
        if (algorithm === 'stability') {
            // Stability: Heaviest total weight cargo first (deepest inside container)
            itemsCopy.sort((a, b) => ((b.weight || 0) * (b.qty || 1)) - ((a.weight || 0) * (a.qty || 1)));
        } else if (algorithm === 'max-volume') {
            // Max volume: Largest cargo volume first
            itemsCopy.sort((a, b) => {
                const volA = ((a.width || 50) * (a.length || 60) * (a.height || 40) * (a.qty || 1));
                const volB = ((b.width || 50) * (b.length || 60) * (b.height || 40) * (b.qty || 1));
                return volB - volA;
            });
        } else if (algorithm === 'easy-loading') {
            // Easy loading (LIFO): Stop 1 deepest inside (back wall), Stop 5 near door
            itemsCopy.sort((a, b) => (a.stop || 'Stop 1').localeCompare(b.stop || 'Stop 1'));
        } else {
            // 'best-balance' (Default): Respect user item sequence, grouping by Stop if specified
            itemsCopy.sort((a, b) => {
                const stopA = a.stop || 'Stop 1';
                const stopB = b.stop || 'Stop 1';
                if (stopA !== stopB) return stopA.localeCompare(stopB);
                return 0; // maintain user card / table order
            });
        }

        // Candidate Points system for seamless 3D interlocking ("Gối đầu" tại điểm giao nhau)
        const candidatePoints = [
            { x: 0, y: 0, z: -CW / 2 }
        ];

        for (const item of itemsCopy) {
            const qty = parseInt(item.qty) || 0;
            totalRequested += qty;

            const baseW = (parseFloat(item.width) || 50) / 100;   // m
            const baseL = (parseFloat(item.length) || 60) / 100;  // m
            const baseH = (parseFloat(item.height) || 40) / 100;  // m
            const unitWeight = parseFloat(item.weight) || 10;
            const color = new THREE.Color(item.color || '#dc2626');
            const shapeType = item.type || 'box';
            const stackable = item.stackable !== false;
            const rotMode = item.rotation || 'horizontal';

            let placedCount = 0;

            // Determine orientations
            const orientations = [];
            orientations.push({ l: baseL, h: baseH, w: baseW });
            if (rotMode !== 'locked' && Math.abs(baseL - baseW) > 0.01) {
                orientations.push({ l: baseW, h: baseH, w: baseL });
            }

            // Pack every unit of this item sequentially
            while (placedCount < qty) {
                let placedThisBox = false;

                // Sort candidate points: smallest X first (fill notches/step-downs left by previous items FIRST), then Y (bottom-up), then Z (left-to-right)
                this.sortCandidatePoints(candidatePoints);

                for (let i = 0; i < candidatePoints.length; i++) {
                    const pt = candidatePoints[i];

                    // Test orientations
                    for (const ori of orientations) {
                        // Check container inner boundaries
                        if (pt.x + ori.l > CL + 0.001) continue;
                        if (pt.y + ori.h > CH + 0.001) continue;
                        if (pt.z + ori.w > CW / 2 + 0.001) continue;
                        if (pt.z < -CW / 2 - 0.001) continue;

                        // Non-stackable constraint: must sit on floor
                        if (!stackable && pt.y > 0.002) continue;

                        // Payload limit check
                        if (totalPlacedWeight + unitWeight > spec.payload * 1.05) {
                            break;
                        }

                        // Collision check
                        if (this.checkCollision(pt.x, pt.y, pt.z, ori.l, ori.h, ori.w)) {
                            continue;
                        }

                        // Support check (must sit on floor or securely on top of previous boxes - "gối đầu")
                        if (!this.isSupported(pt.x, pt.y, pt.z, ori.l, ori.h, ori.w)) {
                            continue;
                        }

                        // VALID POSITION FOUND: Place box!
                        const stepNumber = totalPlaced + 1;
                        const placedBoxObj = this.placeBox(pt.x, pt.y, pt.z, ori.l, ori.h, ori.w, color, item.name, s, shapeType, stepNumber, unitWeight);
                        
                        this.placedBoxes.push({
                            x: pt.x, y: pt.y, z: pt.z,
                            l: ori.l, h: ori.h, w: ori.w,
                            weight: unitWeight,
                            stackable: stackable
                        });

                        this.boxMeshes.push({
                            step: stepNumber,
                            mesh: placedBoxObj.mesh,
                            edgeLines: placedBoxObj.edgeLines,
                            name: item.name,
                            x: pt.x, y: pt.y, z: pt.z,
                            l: ori.l, h: ori.h, w: ori.w,
                            weight: unitWeight,
                            color: item.color,
                            stop: item.stop || 'Stop 1'
                        });

                        placedCount++;
                        totalPlaced++;
                        totalPlacedVolume += (ori.l * ori.w * ori.h);
                        totalPlacedWeight += unitWeight;

                        cogSumX += (pt.x + ori.l / 2) * unitWeight;
                        cogSumY += (pt.y + ori.h / 2) * unitWeight;
                        cogSumZ += (pt.z + ori.w / 2) * unitWeight;

                        // Remove used candidate point
                        candidatePoints.splice(i, 1);

                        // Generate new candidate points around the placed box
                        this.generateCandidatePointsForBox(candidatePoints, pt.x, pt.y, pt.z, ori.l, ori.h, ori.w, CL, CW, CH);

                        placedThisBox = true;
                        break;
                    }

                    if (placedThisBox) break;
                }

                if (!placedThisBox) {
                    // No valid space remains for this item in container
                    break;
                }
            }
        }

        this.scene.add(this.cargoGroup);

        const containerVolume = CL * CW * CH;
        const utilization = ((totalPlacedVolume / containerVolume) * 100).toFixed(1);
        const weightUtilization = ((totalPlacedWeight / spec.payload) * 100).toFixed(1);

        // CoG Analysis & 3D Marker
        let cogText = 'Cân đối (Tâm cont)';
        const avgX = totalPlacedWeight > 0 ? (cogSumX / totalPlacedWeight) : (CL / 2);
        const avgY = totalPlacedWeight > 0 ? (cogSumY / totalPlacedWeight) : (CH / 2);
        const avgZ = totalPlacedWeight > 0 ? (cogSumZ / totalPlacedWeight) : 0;

        if (totalPlacedWeight > 0) {
            const ratioX = avgX / CL;
            if (ratioX > 0.62) {
                cogText = 'Lệch về phía cửa cont';
            } else if (ratioX < 0.38) {
                cogText = 'Lệch về phía đầu cont';
            }
        }

        this.buildCogMarker(avgX, avgY, avgZ, CL, CW, CH);

        this.totalSteps = this.boxMeshes.length;
        this.setPlaybackStep(this.totalSteps);

        return {
            placed: totalPlaced,
            totalRequested: totalRequested,
            unplaced: Math.max(0, totalRequested - totalPlaced),
            volume: totalPlacedVolume.toFixed(3),
            containerVolume: containerVolume.toFixed(1),
            weight: totalPlacedWeight.toFixed(1),
            maxPayload: spec.payload,
            utilization: utilization,
            weightUtilization: weightUtilization,
            cogStatus: cogText,
            cogPos: { x: avgX.toFixed(2), y: avgY.toFixed(2), z: avgZ.toFixed(2) },
            fitsAll: (totalRequested === totalPlaced)
        };
    }

    // Physical support check: box at y > 0 must rest securely on floor or boxes below ("Gối đầu" vững chắc, triệt tiêu khe hở khoảng trống)
    isSupported(x, y, z, l, h, w) {
        if (y <= 0.002) return true; // Sits directly on container floor

        let supportedArea = 0;
        const boxBottomArea = l * w;
        const eps = 0.012; // 12mm height tolerance to account for SKU dimension variance

        let maxSupportX = -Infinity;
        let minSupportX = Infinity;

        for (const b of this.placedBoxes) {
            // Check if top of box b matches y
            if (Math.abs((b.y + b.h) - y) < eps) {
                // If box below is explicitly non-stackable, cannot place on it
                if (b.stackable === false) {
                    return false;
                }

                // Overlap rectangle in X-Z plane
                const overlapX = Math.max(0, Math.min(x + l, b.x + b.l) - Math.max(x, b.x));
                const overlapZ = Math.max(0, Math.min(z + w, b.z + b.w) - Math.max(z, b.z));
                if (overlapX > 0.005 && overlapZ > 0.005) {
                    supportedArea += (overlapX * overlapZ);
                    if (b.x + b.l > maxSupportX) maxSupportX = b.x + b.l;
                    if (b.x < minSupportX) minSupportX = b.x;
                }
            }
        }

        // Require at least 80% bottom surface support to prevent tipping & structural collapse
        if (supportedArea < boxBottomArea * 0.80) {
            return false;
        }

        // Strictly prevent forward overhang: box cannot stick out into thin air beyond the supporting boxes below
        // This eliminates overhang shadows that trap empty chasms/trenches between cargo groups!
        if (maxSupportX > -Infinity && (x + l) > maxSupportX + 0.025) {
            return false;
        }

        // Also prevent backward overhang into mid-air
        if (minSupportX < Infinity && x < minSupportX - 0.025) {
            return false;
        }

        return true;
    }

    addCandidatePoint(pts, x, y, z, CL, CW, CH) {
        if (x < -0.001 || x > CL - 0.05) return;
        if (y < -0.001 || y > CH - 0.05) return;
        if (z < -CW / 2 - 0.001 || z > CW / 2 - 0.05) return;

        const snapX = Math.round(x * 1000) / 1000;
        const snapY = Math.round(y * 1000) / 1000;
        const snapZ = Math.round(z * 1000) / 1000;

        for (let i = 0; i < pts.length; i++) {
            if (Math.abs(pts[i].x - snapX) < 0.005 &&
                Math.abs(pts[i].y - snapY) < 0.005 &&
                Math.abs(pts[i].z - snapZ) < 0.005) {
                return;
            }
        }

        pts.push({ x: snapX, y: snapY, z: snapZ });
    }

    generateCandidatePointsForBox(pts, x, y, z, l, h, w, CL, CW, CH) {
        // 1. In front of the box at the same height
        this.addCandidatePoint(pts, x + l, y, z, CL, CW, CH);
        // 2. On top of the box
        this.addCandidatePoint(pts, x, y + h, z, CL, CW, CH);
        // 3. Beside the box to the right
        this.addCandidatePoint(pts, x, y, z + w, CL, CW, CH);
        // 4. In front of the box on the floor (y = 0)
        this.addCandidatePoint(pts, x + l, 0, z, CL, CW, CH);
        // 5. In front of the box on the floor at the left wall (z = -CW/2)
        this.addCandidatePoint(pts, x + l, 0, -CW / 2, CL, CW, CH);
        // 6. On top of the box at the left wall
        this.addCandidatePoint(pts, x, y + h, -CW / 2, CL, CW, CH);
        // 7. Top-front corner
        this.addCandidatePoint(pts, x + l, y + h, z, CL, CW, CH);
    }

    sortCandidatePoints(pts) {
        pts.sort((a, b) => {
            // 1. Primary: X axis (fill from inside out, smallest X first to fill notches/gaps)
            if (Math.abs(a.x - b.x) > 0.008) {
                return a.x - b.x;
            }
            // 2. Secondary: Y axis (bottom to top, floor first)
            if (Math.abs(a.y - b.y) > 0.008) {
                return a.y - b.y;
            }
            // 3. Tertiary: Z axis (left to right)
            return a.z - b.z;
        });
    }

    checkCollision(x, y, z, l, h, w) {
        const eps = 0.002; // 2mm margin
        for (const box of this.placedBoxes) {
            if (x < box.x + box.l - eps && x + l > box.x + eps &&
                y < box.y + box.h - eps && y + h > box.y + eps &&
                z < box.z + box.w - eps && z + w > box.z + eps) {
                return true;
            }
        }
        return false;
    }

    placeBox(x, y, z, l, h, w, color, name, s, shapeType = 'box', step = 1, weight = 10) {
        let geo;
        if (shapeType === 'cylinder') {
            const radius = Math.min(l, w) / 2 * s - 0.4;
            geo = new THREE.CylinderGeometry(radius, radius, h * s - 0.5, 24);
        } else {
            geo = new THREE.BoxGeometry(l * s - 0.6, h * s - 0.6, w * s - 0.6);
        }

        let mat;
        if (this.viewMode === 'xray') {
            mat = new THREE.MeshLambertMaterial({
                color: color,
                transparent: true,
                opacity: 0.35,
                wireframe: false
            });
        } else if (this.viewMode === 'operational') {
            mat = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.4,
                metalness: 0.15,
                transparent: true,
                opacity: 0.95
            });
        } else {
            mat = new THREE.MeshStandardMaterial({
                color: color,
                roughness: 0.3,
                metalness: 0.1
            });
        }

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
            (x + l / 2) * s,
            (y + h / 2) * s,
            (z + w / 2) * s
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = {
            name, x, y, z, l, h, w,
            step, weight,
            originalColor: color.clone ? color.clone() : new THREE.Color(color)
        };

        this.cargoGroup.add(mesh);

        // Add subtle edge outlines to each box
        const edgesGeo = new THREE.EdgesGeometry(geo);
        const edgesMat = new THREE.LineBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: this.viewMode === 'xray' ? 0.35 : 0.2
        });
        const edgeLines = new THREE.LineSegments(edgesGeo, edgesMat);
        edgeLines.position.copy(mesh.position);
        edgeLines.userData = { step };
        this.cargoGroup.add(edgeLines);

        return { mesh, edgeLines };
    }

    clearCargo() {
        this.pause();
        if (this.cargoGroup) {
            this.scene.remove(this.cargoGroup);
            this.cargoGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.cargoGroup = null;
        }
        if (this.cogMarker) {
            this.scene.remove(this.cogMarker);
            this.cogMarker.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.cogMarker = null;
        }
        this.placedBoxes = [];
        this.boxMeshes = [];
        this.selectedMesh = null;
        this.hoveredMesh = null;
    }

    // ===== 3D Center of Gravity (CoG) Marker =====
    buildCogMarker(x, y, z, CL, CW, CH) {
        if (this.cogMarker) {
            this.scene.remove(this.cogMarker);
        }
        this.cogMarker = new THREE.Group();
        const s = this.scale;

        const posX = x * s;
        const posY = y * s;
        const posZ = z * s;

        // Glowing CoG Sphere
        const sphereGeo = new THREE.SphereGeometry(3.5, 24, 24);
        const sphereMat = new THREE.MeshStandardMaterial({
            color: 0xf59e0b,
            emissive: 0xf59e0b,
            emissiveIntensity: 0.6,
            roughness: 0.2,
            metalness: 0.4
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        sphere.position.set(posX, posY, posZ);
        this.cogMarker.add(sphere);

        // Plumb line to floor
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(posX, posY, posZ),
            new THREE.Vector3(posX, 0, posZ)
        ]);
        const lineMat = new THREE.LineDashedMaterial({
            color: 0xf59e0b,
            dashSize: 2,
            gapSize: 1,
            linewidth: 2
        });
        const plumbLine = new THREE.Line(lineGeo, lineMat);
        plumbLine.computeLineDistances();
        this.cogMarker.add(plumbLine);

        // Orthogonal rings
        const ringGeo = new THREE.TorusGeometry(6, 0.4, 12, 36);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: false });
        const ringX = new THREE.Mesh(ringGeo, ringMat);
        ringX.position.set(posX, posY, posZ);
        ringX.rotation.x = Math.PI / 2;
        this.cogMarker.add(ringX);

        this.cogMarker.visible = this.showCog;
        this.scene.add(this.cogMarker);
    }

    toggleCog(visible) {
        if (visible !== undefined) {
            this.showCog = visible;
        } else {
            this.showCog = !this.showCog;
        }
        if (this.cogMarker) {
            this.cogMarker.visible = this.showCog;
        }
        return this.showCog;
    }

    // ===== Step-by-Step Playback Controls =====
    setPlaybackStep(step) {
        this.currentStep = Math.max(0, Math.min(step, this.totalSteps));

        let currentItem = null;
        for (let i = 0; i < this.boxMeshes.length; i++) {
            const b = this.boxMeshes[i];
            const isVisible = (b.step <= this.currentStep);
            b.mesh.visible = isVisible;
            if (b.edgeLines) b.edgeLines.visible = isVisible;

            if (b.step === this.currentStep) {
                currentItem = b;
            }
        }

        if (this.onStepChange) {
            this.onStepChange(this.currentStep, this.totalSteps, currentItem);
        }
    }

    play() {
        if (this.totalSteps <= 0) return;
        if (this.currentStep >= this.totalSteps) {
            this.setPlaybackStep(0);
        }
        this.isPlaying = true;
        this.clearPlayInterval();

        const delay = Math.max(30, Math.floor(180 / this.playSpeed));
        this.playInterval = setInterval(() => {
            if (this.currentStep < this.totalSteps) {
                this.setPlaybackStep(this.currentStep + 1);
            } else {
                this.pause();
            }
        }, delay);
    }

    pause() {
        this.isPlaying = false;
        this.clearPlayInterval();
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
        return this.isPlaying;
    }

    setPlaySpeed(speed) {
        this.playSpeed = parseFloat(speed) || 1;
        if (this.isPlaying) {
            this.play();
        }
    }

    clearPlayInterval() {
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }

    // ===== 3D Raycasting & Box Selection Inspector =====
    setupRaycaster() {
        if (!this.canvas) return;

        let isDragging = false;
        let downPos = { x: 0, y: 0 };

        this.canvas.addEventListener('pointerdown', (e) => {
            downPos = { x: e.clientX, y: e.clientY };
            isDragging = false;
        });

        this.canvas.addEventListener('pointermove', (e) => {
            const dx = Math.abs(e.clientX - downPos.x);
            const dy = Math.abs(e.clientY - downPos.y);
            if (dx > 4 || dy > 4) {
                isDragging = true;
            }
        });

        this.canvas.addEventListener('pointerup', (e) => {
            if (isDragging) return; // Don't trigger inspect when rotating camera

            const rect = this.canvas.getBoundingClientRect();
            this.mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouseVec, this.camera);

            if (!this.cargoGroup) return;

            const meshes = this.boxMeshes.map(b => b.mesh).filter(m => m.visible);
            const intersects = this.raycaster.intersectObjects(meshes, false);

            if (intersects.length > 0) {
                const hitMesh = intersects[0].object;
                this.selectBoxMesh(hitMesh);
            } else {
                this.deselectBox();
            }
        });
    }

    selectBoxMesh(mesh) {
        // Reset previous selected
        if (this.selectedMesh && this.selectedMesh.material) {
            if (this.selectedMesh.userData.originalColor) {
                this.selectedMesh.material.color.copy(this.selectedMesh.userData.originalColor);
            }
            if (this.selectedMesh.material.emissive) {
                this.selectedMesh.material.emissive.setHex(0x000000);
            }
        }

        this.selectedMesh = mesh;
        if (mesh && mesh.material) {
            if (mesh.material.emissive) {
                mesh.material.emissive.setHex(0x06b6d4);
                mesh.material.emissiveIntensity = 0.5;
            }
        }

        if (this.onBoxSelect && mesh && mesh.userData) {
            this.onBoxSelect(mesh.userData);
        }
    }

    deselectBox() {
        if (this.selectedMesh && this.selectedMesh.material) {
            if (this.selectedMesh.userData.originalColor) {
                this.selectedMesh.material.color.copy(this.selectedMesh.userData.originalColor);
            }
            if (this.selectedMesh.material.emissive) {
                this.selectedMesh.material.emissive.setHex(0x000000);
            }
        }
        this.selectedMesh = null;
        if (this.onBoxSelect) {
            this.onBoxSelect(null);
        }
    }

    // ===== View & Camera Controls =====
    setViewMode(mode) {
        this.viewMode = mode;
        this.buildContainer();
        // Re-render cargo with new materials
        if (this.cargoGroup) {
            const children = [...this.cargoGroup.children];
            children.forEach(child => {
                if (child.isMesh && child.material) {
                    if (mode === 'xray') {
                        child.material.transparent = true;
                        child.material.opacity = 0.3;
                        child.material.wireframe = false;
                    } else if (mode === 'operational') {
                        child.material.transparent = true;
                        child.material.opacity = 0.85;
                    } else {
                        child.material.transparent = false;
                        child.material.opacity = 1;
                    }
                    child.material.needsUpdate = true;
                }
                if (child.isLineSegments && child.material) {
                    child.material.opacity = mode === 'xray' ? 0.5 : 0.15;
                    child.material.color.set(mode === 'xray' ? 0x00e5ff : 0x000000);
                    child.material.needsUpdate = true;
                }
            });
        }
    }

    setCamera(preset) {
        const spec = this.containerSpecs[this.currentEquipment];
        const s = this.scale;
        const L = spec.l * s, W = spec.w * s, H = spec.h * s;
        const center = new THREE.Vector3(L / 2, H / 2.5, 0);

        const positions = {
            isometric: new THREE.Vector3(L * 1.2, H * 1.5, L * 0.8),
            door: new THREE.Vector3(L * 1.8, H * 0.5, 0),
            top: new THREE.Vector3(L / 2, H * 4, 0.1),
            side: new THREE.Vector3(L / 2, H * 0.5, L * 1.2),
            reset: new THREE.Vector3(L * 1.2, H * 1.5, L * 0.8)
        };

        const target = positions[preset] || positions.isometric;
        this.animateCamera(target, center);
    }

    animateCamera(targetPos, targetLook) {
        if (!this.controls) return;
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const duration = 800;
        const start = performance.now();

        const anim = (now) => {
            const t = Math.min((now - start) / duration, 1);
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

            this.camera.position.lerpVectors(startPos, targetPos, ease);
            this.controls.target.lerpVectors(startTarget, targetLook, ease);
            this.controls.update();

            if (t < 1) requestAnimationFrame(anim);
        };
        requestAnimationFrame(anim);
    }

    setHeightCut(percentage) {
        this.heightCut = percentage / 100;
        if (this.cargoGroup) {
            const spec = this.containerSpecs[this.currentEquipment];
            const maxH = spec.h * this.scale;
            const cutHeight = maxH * this.heightCut;

            this.cargoGroup.children.forEach(child => {
                if (child.userData && child.userData.y !== undefined) {
                    const boxTop = (child.userData.y + child.userData.h) * this.scale;
                    child.visible = boxTop <= cutHeight + 1;
                }
            });
        }
    }

    setEquipment(type) {
        if (this.containerSpecs[type]) {
            this.currentEquipment = type;
            this.buildContainer();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const w = this.viewport.clientWidth;
        const h = this.viewport.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.viewport.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen();
        }
    }
}

// ===== Hero 3D Cargo Hologram (High-Performance, Smooth & Lively) =====
function initHeroGlobe() {
    const container = document.getElementById('heroGlobe');
    if (!container) return;

    // Clear any existing canvas
    container.innerHTML = '';

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 300;

    // 1. Scene setup
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 1000);
    camera.position.set(42, 22, 62);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // 2. High-Tech Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0x1a2942, 1.2);
    scene.add(ambientLight);

    // Main key light
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(50, 70, 50);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Cyan backlight for futuristic cyber edge glow
    const cyanLight = new THREE.PointLight(0x00e5ff, 2.5, 120);
    cyanLight.position.set(-40, 25, -30);
    scene.add(cyanLight);

    // Orange/Gold accent light for warm cargo reflections
    const orangeLight = new THREE.PointLight(0xf59e0b, 2.0, 100);
    orangeLight.position.set(40, -10, 30);
    scene.add(orangeLight);

    // 3. Main Rotating Group
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    // 4. Ground Holographic Grid / Pedestal
    const gridHelper = new THREE.GridHelper(90, 18, 0x06b6d4, 0x1e3a5f);
    gridHelper.position.y = -13.5;
    stageGroup.add(gridHelper);

    // Subtle glowing platform ring
    const ringGeo = new THREE.RingGeometry(28, 30, 48);
    const ringMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -13.4;
    stageGroup.add(ring);

    // Outer counter-rotating dashed ring
    const ringGeo2 = new THREE.RingGeometry(38, 39, 36);
    const ringMat2 = new THREE.MeshBasicMaterial({
        color: 0x3b82f6,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = -13.4;
    stageGroup.add(ring2);

    // 5. Container Dimensions (Accurate Proportions)
    const cL = 52, cH = 22, cW = 22;

    // Glowing wireframe outline of the container
    const containerBoxGeo = new THREE.BoxGeometry(cL, cH, cW);
    const containerEdges = new THREE.EdgesGeometry(containerBoxGeo);
    const containerLineMat = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.85
    });
    const containerFrame = new THREE.LineSegments(containerEdges, containerLineMat);
    stageGroup.add(containerFrame);

    // Semi-transparent container glass walls with soft reflections
    const wallMat = new THREE.MeshPhysicalMaterial({
        color: 0x0f2744,
        transparent: true,
        opacity: 0.22,
        roughness: 0.2,
        metalness: 0.1,
        transmission: 0.6,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const containerMesh = new THREE.Mesh(containerBoxGeo, wallMat);
    stageGroup.add(containerMesh);

    // 6. Vibrant Cargo Units with Dynamic Floating & Breathing Animation
    const cargoGroup = new THREE.Group();
    stageGroup.add(cargoGroup);

    const cargoColors = [
        { c: 0xdc2626, name: 'Red' },     // TNG Red
        { c: 0x0284c7, name: 'Blue' },    // Ocean Blue
        { c: 0xf59e0b, name: 'Amber' },   // Golden Cargo
        { c: 0x10b981, name: 'Green' },   // Emerald Green
        { c: 0x8b5cf6, name: 'Purple' }   // Violet
    ];

    const cargoUnits = [];
    const cols = 5;
    const rows = 2;
    const stacks = 2;
    const bW = 8.5;
    const bH = 8.5;
    const bL = 8.5;

    let colorIdx = 0;
    for (let x = 0; x < cols; x++) {
        for (let z = 0; z < stacks; z++) {
            for (let y = 0; y < rows; y++) {
                // Staggered arrangement for realistic look
                if (x === 4 && y === 1 && z === 1) continue; // irregular top stack
                if (x === 0 && y === 1 && z === 0) continue;

                const colorInfo = cargoColors[colorIdx % cargoColors.length];
                colorIdx++;

                const boxGeo = new THREE.BoxGeometry(bL - 0.4, bH - 0.4, bW - 0.4);
                const boxMat = new THREE.MeshStandardMaterial({
                    color: colorInfo.c,
                    roughness: 0.35,
                    metalness: 0.25,
                    emissive: colorInfo.c,
                    emissiveIntensity: 0.08
                });

                const boxMesh = new THREE.Mesh(boxGeo, boxMat);
                boxMesh.castShadow = true;
                boxMesh.receiveShadow = true;

                // Box edges for crisp clarity
                const boxEdgesGeo = new THREE.EdgesGeometry(boxGeo);
                const boxEdgesMat = new THREE.LineBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.3
                });
                const boxEdgeLines = new THREE.LineSegments(boxEdgesGeo, boxEdgesMat);
                boxMesh.add(boxEdgeLines);

                // Base anchor position inside container
                const baseX = -cL / 2 + bL / 2 + 3 + x * (bL + 0.6);
                const baseY = -cH / 2 + bH / 2 + 1 + y * (bH + 0.5);
                const baseZ = -cW / 2 + bW / 2 + 2 + z * (bW + 0.6);

                boxMesh.position.set(baseX, baseY, baseZ);

                // Store animation metadata
                cargoUnits.push({
                    mesh: boxMesh,
                    baseX,
                    baseY,
                    baseZ,
                    phase: (x * 0.5 + y * 0.8 + z * 0.3),
                    speed: 1.8 + Math.random() * 0.6,
                    heightOffset: (Math.random() - 0.5) * 0.6
                });

                cargoGroup.add(boxMesh);
            }
        }
    }

    // 7. Interactive Laser / LIDAR Scanner Beam
    const scanPlaneGeo = new THREE.PlaneGeometry(0.8, cH * 1.05);
    const scanPlaneMat = new THREE.MeshBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
    });
    const scanPlane = new THREE.Mesh(scanPlaneGeo, scanPlaneMat);
    scanPlane.rotation.y = Math.PI / 2;
    stageGroup.add(scanPlane);

    // Glowing laser line at scan plane edge
    const laserLineGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -cH / 2, -cW / 2),
        new THREE.Vector3(0, cH / 2, -cW / 2),
        new THREE.Vector3(0, cH / 2, cW / 2),
        new THREE.Vector3(0, -cH / 2, cW / 2),
        new THREE.Vector3(0, -cH / 2, -cW / 2)
    ]);
    const laserLineMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        linewidth: 2,
        transparent: true,
        opacity: 0.95
    });
    const laserFrame = new THREE.Line(laserLineGeo, laserLineMat);
    scanPlane.add(laserFrame);

    // 8. Floating Glowing Data Particles
    const pCount = 80;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    const pVel = [];

    for (let i = 0; i < pCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 110;
        pPos[i * 3 + 1] = (Math.random() - 0.5) * 60;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 80;
        pVel.push({
            x: (Math.random() - 0.5) * 0.08,
            y: (Math.random() - 0.5) * 0.12,
            z: (Math.random() - 0.5) * 0.08
        });
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
        color: 0x00e5ff,
        size: 1.8,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // 9. Interactive Mouse / Pointer Parallax
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    let isHovered = false;

    container.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        mouse.targetX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.targetY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
        isHovered = true;
    });

    container.addEventListener('mouseleave', () => {
        mouse.targetX = 0;
        mouse.targetY = 0;
        isHovered = false;
    });

    // 10. Smooth Render Loop
    let clock = new THREE.Clock();

    function renderFrame() {
        requestAnimationFrame(renderFrame);
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Smooth mouse damping (lerp)
        mouse.x += (mouse.targetX - mouse.x) * 0.06;
        mouse.y += (mouse.targetY - mouse.y) * 0.06;

        // Container stage rotation & gentle floating
        const baseRotY = time * 0.45;
        stageGroup.rotation.y = baseRotY + mouse.x * 0.5;
        stageGroup.rotation.x = Math.sin(time * 0.8) * 0.08 + mouse.y * 0.35;
        stageGroup.position.y = Math.sin(time * 1.5) * 1.4;

        // Rotating platform rings
        ring.rotation.z = time * 0.3;
        ring2.rotation.z = -time * 0.2;

        // Animate Laser Scanner (sweeping back and forth across container)
        const scanX = Math.sin(time * 1.8) * (cL / 2 - 2);
        scanPlane.position.x = scanX;
        scanPlaneMat.opacity = 0.35 + Math.sin(time * 6) * 0.15;

        // Animate each cargo box (lively rhythmic levitation & breathing)
        for (let i = 0; i < cargoUnits.length; i++) {
            const unit = cargoUnits[i];
            const floatOffset = Math.sin(time * unit.speed + unit.phase) * 1.2;
            unit.mesh.position.y = unit.baseY + floatOffset;

            // Highlight box when scanner passes over it
            const distToScan = Math.abs(unit.mesh.position.x - scanX);
            if (distToScan < 5) {
                unit.mesh.material.emissiveIntensity = 0.45 * (1 - distToScan / 5);
            } else {
                unit.mesh.material.emissiveIntensity = 0.08;
            }
        }

        // Orbiting cyan & orange lights
        cyanLight.position.x = Math.sin(time * 1.2) * 55;
        cyanLight.position.z = Math.cos(time * 1.2) * 55;
        orangeLight.position.x = -Math.sin(time * 0.9) * 45;
        orangeLight.position.z = -Math.cos(time * 0.9) * 45;

        // Animate Floating Data Particles
        const positions = particles.geometry.attributes.position.array;
        for (let i = 0; i < pCount; i++) {
            positions[i * 3] += pVel[i].x;
            positions[i * 3 + 1] += pVel[i].y;
            positions[i * 3 + 2] += pVel[i].z;

            // Boundary wrap-around
            if (positions[i * 3] > 60 || positions[i * 3] < -60) pVel[i].x *= -1;
            if (positions[i * 3 + 1] > 35 || positions[i * 3 + 1] < -35) pVel[i].y *= -1;
            if (positions[i * 3 + 2] > 45 || positions[i * 3 + 2] < -45) pVel[i].z *= -1;
        }
        particles.geometry.attributes.position.needsUpdate = true;
        particles.rotation.y = time * 0.05;

        camera.lookAt(0, 0, 0);
        renderer.render(scene, camera);
    }

    renderFrame();

    // Responsive resize handler
    window.addEventListener('resize', () => {
        if (!container) return;
        const newW = container.clientWidth;
        const newH = container.clientHeight;
        if (newW > 0 && newH > 0) {
            camera.aspect = newW / newH;
            camera.updateProjectionMatrix();
            renderer.setSize(newW, newH);
        }
    });
}
