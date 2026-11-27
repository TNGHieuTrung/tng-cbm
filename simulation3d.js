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

        // Container specs (meters) including ISO doorway clearance (doorW, doorH)
        this.containerSpecs = {
            '20dc': { l: 5.898, w: 2.352, h: 2.393, doorW: 2.340, doorH: 2.280, name: "20' Dry Container (20DC)", payload: 28200 },
            '40dc': { l: 12.032, w: 2.352, h: 2.393, doorW: 2.340, doorH: 2.280, name: "40' Dry Container (40DC)", payload: 26680 },
            '40hc': { l: 12.032, w: 2.352, h: 2.698, doorW: 2.340, doorH: 2.585, name: "40' High Cube (40HC)", payload: 26460 },
            '45hc': { l: 13.556, w: 2.352, h: 2.698, doorW: 2.340, doorH: 2.585, name: "45' High Cube (45HC)", payload: 27800 },
            'custom': { l: 6.0, w: 2.4, h: 2.4, doorW: 2.340, doorH: 2.290, name: "Tùy chỉnh / Custom", payload: 20000 }
        };

        this.currentEquipment = '20dc';
        this.scale = 40; // 1m = 40 units in scene
        this.multiContainerData = [];
        this.activeContainerIdx = 0;

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

        // Renderer (preserveDrawingBuffer enables crisp client-side 3D snapshots for PDF loading plans)
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, preserveDrawingBuffer: true });
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

        // Visual ISO doorway top header beam (shows actual door opening height clearance)
        const spec = this.containerSpecs[this.currentEquipment];
        if (spec && spec.doorH && spec.doorH < spec.h - 0.01) {
            const headerDrop = (spec.h - spec.doorH) * this.scale;
            const headerGeo = new THREE.BoxGeometry(2.4, headerDrop, W);
            const headerMat = new THREE.MeshLambertMaterial({
                color: 0xf59e0b,
                transparent: true,
                opacity: 0.42
            });
            const headerBar = new THREE.Mesh(headerGeo, headerMat);
            headerBar.position.set(L - 1.2, H - headerDrop / 2, 0);
            this.container3D.add(headerBar);
        }
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

    // Helper: Sort items for sequential loading based on algorithm, Include filter & Priority position
    sortCargoItemsByAlgorithm(cargoItems, algorithm) {
        const itemsCopy = cargoItems
            .filter(item => item.included !== false && (parseInt(item.qty) || 0) > 0)
            .map((item, idx) => ({ ...item, _origIdx: idx }));

        if (algorithm === 'garment') {
            // Garment algorithm: default items to garment anti-wrinkle mode
            itemsCopy.forEach(it => {
                if (!it.rotation || it.rotation === 'horizontal' || it.rotation === 'fit') {
                    it.rotation = 'garment';
                }
            });
        }

        const posRank = (pos) => {
            if (pos === 'rear') return 0; // Deepest against front wall (X = 0)
            if (pos === 'door') return 2; // Closest to container doors (loaded last / unload first)
            return 1;                     // Normal sequence
        };

        itemsCopy.sort((a, b) => {
            // 1. Explicit position priority always takes precedence (rear -> normal -> door)
            const rA = posRank(a.position);
            const rB = posRank(b.position);
            if (rA !== rB) return rA - rB;

            // 2. Within same priority tier, apply selected algorithm ordering
            if (algorithm === 'stability') {
                const diff = ((b.weight || 0) * (b.qty || 1)) - ((a.weight || 0) * (a.qty || 1));
                if (Math.abs(diff) > 0.001) return diff;
            } else if (algorithm === 'max-volume') {
                const volA = ((a.width || 50) * (a.length || 60) * (a.height || 40) * (a.qty || 1));
                const volB = ((b.width || 50) * (b.length || 60) * (b.height || 40) * (b.qty || 1));
                if (Math.abs(volB - volA) > 0.001) return volB - volA;
            } else if (algorithm === 'easy-loading') {
                const cmp = (a.stop || 'Stop 1').localeCompare(b.stop || 'Stop 1');
                if (cmp !== 0) return cmp;
            } else {
                const stopA = a.stop || 'Stop 1';
                const stopB = b.stop || 'Stop 1';
                if (stopA !== stopB) return stopA.localeCompare(stopB);
            }
            return a._origIdx - b._origIdx;
        });

        return itemsCopy;
    }

    // ===== High-Precision 3D Bin-Packing Algorithm with Strip-Width Optimization, Sequential SKU Packing & Multi-Container Support =====
    computeWidthStripPlan(baseL, baseW, CW, rotMode) {
        const a0 = Math.floor((CW + 0.002) / baseW);
        const purePUsed = a0 * baseW;
        const purePDensity = a0 / baseL;

        if (rotMode === 'locked' || Math.abs(baseL - baseW) <= 0.01) {
            return { a: a0, b: 0, used: purePUsed, density: purePDensity };
        }

        const b0 = Math.floor((CW + 0.002) / baseL);
        const pureRUsed = b0 * baseL;
        const pureRDensity = b0 / baseW;

        let best = { a: a0, b: 0, used: purePUsed, density: purePDensity };
        for (let a = 0; a <= a0; a++) {
            const b = Math.floor((CW + 0.002 - a * baseW) / baseL);
            const used = a * baseW + b * baseL;
            const density = a / baseL + b / baseW;
            if (density > best.density + 1e-6 ||
                (Math.abs(density - best.density) <= 1e-6 &&
                    (used > best.used + 1e-4 || (Math.abs(used - best.used) <= 1e-4 && b < best.b)))) {
                best = { a, b, used, density };
            }
        }

        if (rotMode === 'garment') {
            if (purePDensity >= best.density * 0.96 && (CW - purePUsed) <= 0.14) {
                return { a: a0, b: 0, used: purePUsed, density: purePDensity };
            }
            if (pureRDensity >= best.density * 0.98 && (CW - pureRUsed) <= 0.14) {
                return { a: 0, b: b0, used: pureRUsed, density: pureRDensity };
            }
        } else {
            if (purePDensity >= best.density * 0.975 && (CW - purePUsed) <= 0.10) {
                return { a: a0, b: 0, used: purePUsed, density: purePDensity };
            }
            if (pureRDensity >= best.density * 0.975 && (CW - pureRUsed) <= 0.10) {
                return { a: 0, b: b0, used: pureRUsed, density: pureRDensity };
            }
        }

        return best;
    }

    initSpatialGrid(CW) {
        this._spatialGrid = new Map();
        this._spatialCellSize = 0.30;
        this._spatialCW = CW;
    }

    getSpatialKeys(x, y, z, l, h, w) {
        const cs = this._spatialCellSize || 0.30;
        const halfW = (this._spatialCW || 2.352) / 2;
        const minGx = Math.floor(x / cs);
        const maxGx = Math.floor((x + l) / cs);
        const minGy = Math.floor(y / cs);
        const maxGy = Math.floor((y + h) / cs);
        const minGz = Math.floor((z + halfW) / cs);
        const maxGz = Math.floor((z + halfW + w) / cs);

        const keys = [];
        for (let gx = minGx; gx <= maxGx; gx++) {
            for (let gy = minGy; gy <= maxGy; gy++) {
                for (let gz = minGz; gz <= maxGz; gz++) {
                    keys.push(((gx + 10) * 1000 + (gy + 10)) * 1000 + (gz + 10));
                }
            }
        }
        return keys;
    }

    insertSpatialBox(box) {
        if (!this._spatialGrid) return;
        const keys = this.getSpatialKeys(box.x, box.y, box.z, box.l, box.h, box.w);
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            let bucket = this._spatialGrid.get(k);
            if (!bucket) {
                bucket = [];
                this._spatialGrid.set(k, bucket);
            }
            bucket.push(box);
        }
    }

    packCargo(cargoItems, algorithm = 'best-balance', containerTypesList = null, options = {}) {
        const contList = (containerTypesList && containerTypesList.length > 0)
            ? containerTypesList
            : [this.currentEquipment];

        return this.packMultiContainers(cargoItems, algorithm, contList, options);
    }

    packMultiContainers(cargoItems, algorithm = 'best-balance', containerTypesList = ['40hc'], options = {}) {
        this.clearCargo();
        this.multiContainerData = [];
        this.activeContainerIdx = 0;

        const itemsSorted = this.sortCargoItemsByAlgorithm(cargoItems, algorithm);
        let remainingCargo = itemsSorted.map(it => ({
            ...it,
            remainingQty: parseInt(it.qty) || 0
        }));
        const totalRequested = itemsSorted.reduce((acc, it) => acc + (parseInt(it.qty) || 0), 0);

        containerTypesList.forEach((contType, idx) => {
            const spec = this.containerSpecs[contType] || this.containerSpecs['40hc'];
            this.currentEquipment = contType;

            // Pack single container from remaining unplaced items
            const packRes = this.packSingleContainerInternal(remainingCargo, spec, algorithm, options);

            this.multiContainerData.push({
                index: idx,
                type: contType,
                name: spec.name,
                placedBoxes: packRes.placedBoxes,
                boxMeshesData: packRes.boxMeshesData,
                stats: packRes.stats,
                cogPos: packRes.cogPos
            });

            // Feed unplaced items to next container
            remainingCargo = packRes.unplacedItems;
        });

        const totalPlaced = this.multiContainerData.reduce((acc, c) => acc + c.stats.placed, 0);
        const totalUnplaced = Math.max(0, totalRequested - totalPlaced);

        this.multiContainerData.forEach((c, idx) => {
            c.stats.totalRequested = totalRequested;
            c.stats.fleetTotalRequested = totalRequested;
            c.stats.fleetTotalPlaced = totalPlaced;
            c.stats.fleetTotalUnplaced = totalUnplaced;
            c.stats.containerIndex = idx;
            c.stats.containerCount = containerTypesList.length;
        });

        // Display Container 1 in 3D canvas by default
        this.showContainer(0);

        return {
            containers: this.multiContainerData.map(c => c.stats),
            activeContainerStats: this.multiContainerData[0].stats,
            totalPlaced: totalPlaced,
            totalRequested: totalRequested,
            totalUnplaced: totalUnplaced,
            fitsAll: (totalUnplaced === 0),
            multiMode: (containerTypesList.length > 1)
        };
    }

    computeOptimalContainerCount(cargoItems, algorithm = 'best-balance', contType = '40hc', options = {}) {
        const prevEquipment = this.currentEquipment;
        const prevPlacedBoxes = this.placedBoxes;
        const prevSpatialGrid = this._spatialGrid;

        const spec = this.containerSpecs[contType] || this.containerSpecs['40hc'];
        const itemsSorted = this.sortCargoItemsByAlgorithm(cargoItems, algorithm);
        let remainingCargo = itemsSorted.map(it => ({
            ...it,
            remainingQty: parseInt(it.qty) || 0
        }));

        let count = 0;
        const maxConts = 20;
        while (count < maxConts) {
            const remTotal = remainingCargo.reduce((acc, it) => acc + (parseInt(it.remainingQty) || 0), 0);
            if (remTotal <= 0) break;

            const packRes = this.packSingleContainerInternal(remainingCargo, spec, algorithm, options);
            if (!packRes || packRes.stats.placed <= 0) break;

            count++;
            remainingCargo = packRes.unplacedItems;
            if (remainingCargo.length === 0) break;
        }

        this.currentEquipment = prevEquipment;
        this.placedBoxes = prevPlacedBoxes;
        this._spatialGrid = prevSpatialGrid;

        return Math.max(1, count);
    }

    // Smart Mixed Fleet Optimizer: evaluates homogeneous & mixed container fleets (e.g. 1×40HC + 1×20DC vs 2×40HC vs 1×45HC)
    // Reuses prefix container packing results so multi-container comparison completes rapidly.
    computeOptimalMixedFleet(cargoItems, algorithm = 'best-balance', options = {}) {
        const prevEquipment = this.currentEquipment;
        const prevPlacedBoxes = this.placedBoxes;
        const prevSpatialGrid = this._spatialGrid;

        const itemsSorted = this.sortCargoItemsByAlgorithm(cargoItems, algorithm);
        const initialCargo = itemsSorted.map(it => ({ ...it, remainingQty: parseInt(it.qty) || 0 }));
        const totalRequested = initialCargo.reduce((acc, it) => acc + it.remainingQty, 0);
        if (totalRequested <= 0) {
            return [];
        }

        const totalCargoVol = initialCargo.reduce((acc, it) => {
            const l = (parseFloat(it.length) || 60) / 100;
            const w = (parseFloat(it.width) || 50) / 100;
            const h = (parseFloat(it.height) || 40) / 100;
            return acc + l * w * h * it.remainingQty;
        }, 0);

        const stdTypes = ['20dc', '40dc', '40hc', '45hc'];
        const typeVol = (t) => {
            const s = this.containerSpecs[t];
            return s.l * s.w * s.h;
        };
        const formatFleetLabel = (fleet) => {
            const counts = {};
            const order = ['45hc', '40hc', '40dc', '20dc'];
            fleet.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
            return order.filter(t => counts[t]).map(t => `${counts[t]}×${t.toUpperCase()}`).join(' + ');
        };

        const plansMap = new Map();
        const recordPlan = (fleet, totalPlaced, totalUnplaced) => {
            if (totalUnplaced > 0 || fleet.length === 0) return;
            // Canonical sort largest-first so ['40hc','20dc'] and ['20dc','40hc'] dedup cleanly
            const rank = { '45hc': 0, '40hc': 1, '40dc': 2, '20dc': 3 };
            const normalized = fleet.slice().sort((a, b) => (rank[a] ?? 9) - (rank[b] ?? 9));
            const key = normalized.join(',');
            if (plansMap.has(key)) return;
            const fleetCbm = normalized.reduce((acc, t) => acc + typeVol(t), 0);
            const fleetUtil = fleetCbm > 0 ? (totalCargoVol / fleetCbm) * 100 : 0;
            // Approximate relative sea-freight cost units (20DC ≈ 1.0, 40DC ≈ 1.65, 40HC ≈ 1.72, 45HC ≈ 2.0)
            const costMap = { '20dc': 1.0, '40dc': 1.65, '40hc': 1.72, '45hc': 2.0 };
            const estCost = normalized.reduce((acc, t) => acc + (costMap[t] || 1.72), 0);
            plansMap.set(key, {
                fleet: normalized,
                label: formatFleetLabel(normalized),
                containerCount: normalized.length,
                fleetCbm: fleetCbm.toFixed(1),
                fleetUtil: fleetUtil.toFixed(1),
                fleetUtilNum: fleetUtil,
                estCost: estCost,
                fitsAll: true
            });
        };

        const packRemWithType = (rem, contType) => {
            const spec = this.containerSpecs[contType];
            return this.packSingleContainerInternal(rem, spec, algorithm, options);
        };

        // 1. Check if a single standard container fits 100%
        for (const t of stdTypes) {
            if (typeVol(t) >= totalCargoVol * 0.96) {
                const res = packRemWithType(initialCargo, t);
                if (res.stats.unplaced === 0) {
                    recordPlan([t], res.stats.placed, 0);
                }
            }
        }

        // 2. Prefix-reusing multi-container search with base types ('40hc' and '45hc')
        const evaluateBase = (baseType) => {
            let rem = initialCargo;
            const prefix = [];
            const maxConts = 12;

            while (prefix.length < maxConts) {
                const remVol = rem.reduce((acc, it) => {
                    const l = (parseFloat(it.length) || 60) / 100;
                    const w = (parseFloat(it.width) || 50) / 100;
                    const h = (parseFloat(it.height) || 40) / 100;
                    return acc + l * w * h * it.remainingQty;
                }, 0);

                // If remaining cargo might fit in 1 last container, try ALL smaller/equal/larger endings!
                if (prefix.length >= 1 && remVol <= typeVol('45hc') * 0.95) {
                    for (const tailType of stdTypes) {
                        if (typeVol(tailType) * 0.95 < remVol) continue;
                        const tailRes = packRemWithType(rem, tailType);
                        if (tailRes.stats.unplaced === 0) {
                            recordPlan(prefix.concat([tailType]), totalRequested, 0);
                        }
                    }
                }

                const stepRes = packRemWithType(rem, baseType);
                if (!stepRes || stepRes.stats.placed <= 0) break;
                prefix.push(baseType);
                rem = stepRes.unplacedItems;
                if (rem.length === 0) {
                    recordPlan(prefix, totalRequested, 0);
                    break;
                }
            }
        };

        evaluateBase('40hc');
        if (totalCargoVol > 58) {
            evaluateBase('45hc');
        }
        // Test 40dc base only when 1x40DC + 1x20DC or 2x40DC is realistically feasible (<= 118 m³)
        if (totalCargoVol > 30 && totalCargoVol <= 118) {
            evaluateBase('40dc');
        }

        this.currentEquipment = prevEquipment;
        this.placedBoxes = prevPlacedBoxes;
        this._spatialGrid = prevSpatialGrid;

        const plans = Array.from(plansMap.values());
        // Rank: fewest wasted space & lowest relative freight cost first, breaking ties by highest utilization
        plans.sort((a, b) => {
            const costDiff = a.estCost - b.estCost;
            if (Math.abs(costDiff) > 0.08) return costDiff;
            return b.fleetUtilNum - a.fleetUtilNum;
        });

        return plans.slice(0, 4).map((p, idx) => ({ ...p, recommended: idx === 0 }));
    }

    packSingleContainerInternal(cargoItems, spec, algorithm, options = {}) {
        const marginL = Math.max(0, Math.min(15, parseFloat(options.marginL) || 0));
        const marginW = Math.max(0, Math.min(15, parseFloat(options.marginW) || 0));
        const marginH = Math.max(0, Math.min(15, parseFloat(options.marginH) || 0));
        const CL = Math.round(spec.l * (1 - marginL / 100) * 1000) / 1000;
        const CW = Math.round(spec.w * (1 - marginW / 100) * 1000) / 1000;
        const CH = Math.round(spec.h * (1 - marginH / 100) * 1000) / 1000;
        const enforcePayload = options.enforcePayload === true;
        const enforceDoorClearance = options.enforceDoorClearance === true;
        const doorW = Math.min(CW, (spec.doorW || spec.w) * (1 - marginW / 100));
        const doorH = Math.min(CH, (spec.doorH || spec.h) * (1 - marginH / 100));
        const doorOpts = enforceDoorClearance ? { enforce: true, doorW, doorH, headerZone: 0.50 } : null;

        this.placedBoxes = []; // Temporary for collision / support validation
        this.initSpatialGrid(CW);

        const boxMeshesData = [];
        let candidatePoints = [{ x: 0, y: 0, z: -CW / 2 }];

        let totalPlaced = 0;
        let totalPlacedVolume = 0;
        let totalPlacedWeight = 0;
        let rotatedCount = 0;
        let hitPayloadLimit = false;
        let maxX = 0;
        let doorZoneMinX = null;

        let cogSumX = 0;
        let cogSumY = 0;
        let cogSumZ = 0;

        const unplacedItems = [];

        for (let itemIdx = 0; itemIdx < cargoItems.length; itemIdx++) {
            const item = cargoItems[itemIdx];
            const qty = parseInt(item.remainingQty !== undefined ? item.remainingQty : item.qty) || 0;
            if (qty <= 0) continue;

            // Boundary-only pruning across remaining SKUs' smallest dimension (preserves sub-cm transitions)
            let minRemDim = Infinity;
            for (let k = itemIdx; k < cargoItems.length; k++) {
                const remIt = cargoItems[k];
                const remQ = parseInt(remIt.remainingQty !== undefined ? remIt.remainingQty : remIt.qty) || 0;
                if (remQ <= 0) continue;
                const dL = (parseFloat(remIt.length) || 60) / 100;
                const dW = (parseFloat(remIt.width) || 50) / 100;
                const dH = (parseFloat(remIt.height) || 40) / 100;
                minRemDim = Math.min(minRemDim, dL, dW, dH);
            }
            if (isFinite(minRemDim)) {
                candidatePoints = candidatePoints.filter(pt =>
                    pt.x + minRemDim <= CL + 0.001 &&
                    pt.y + minRemDim <= CH + 0.001 &&
                    pt.z + minRemDim <= CW / 2 + 0.001
                );
            }

            const baseW = (parseFloat(item.width) || 50) / 100;   // m
            const baseL = (parseFloat(item.length) || 60) / 100;  // m
            const baseH = (parseFloat(item.height) || 40) / 100;  // m
            const parsedWt = parseFloat(item.weight);
            const unitWeight = isNaN(parsedWt) ? 0 : Math.max(0, parsedWt);
            const color = item.color || '#dc2626';
            const shapeType = item.type || 'box';
            const stackable = item.stackable !== false; // Allow OTHER boxes to stack ON TOP of this box
            const floorOnly = item.floorOnly === true;  // Restrict THIS box to container floor only (y = 0)
            const rotMode = (algorithm === 'garment' && (!item.rotation || item.rotation === 'horizontal' || item.rotation === 'fit'))
                ? 'garment'
                : (item.rotation || 'fit');

            let placedCount = 0;

            const primaryOri = { l: baseL, h: baseH, w: baseW, isPrimary: true };
            const rotOri = { l: baseW, h: baseH, w: baseL, isPrimary: false };
            const extra3DOris = (rotMode === 'all' || rotMode === '3d') ? [
                { l: baseL, h: baseW, w: baseH, isPrimary: false },
                { l: baseW, h: baseL, w: baseH, isPrimary: false },
                { l: baseH, h: baseL, w: baseW, isPrimary: false },
                { l: baseH, h: baseW, w: baseL, isPrimary: false }
            ] : [];

            const plan = this.computeWidthStripPlan(baseL, baseW, CW, rotMode);
            const hasTwoBands = (plan.a > 0 && plan.b > 0);
            const band1EndZ = Math.round((-CW / 2 + plan.a * baseW) * 1000) / 1000;
            const bandInfo = { hasTwoBands, band1EndZ };
            const canRotateHoriz = (rotMode !== 'locked' && Math.abs(baseL - baseW) > 0.01);

            // Build canonical Z-lanes for this SKU's optimal width strip plan
            const canonicalLanes = [];
            for (let k = 0; k < plan.a; k++) {
                canonicalLanes.push({
                    z: Math.round((-CW / 2 + k * baseW) * 1000) / 1000,
                    ori: primaryOri,
                    band: 1
                });
            }
            for (let m = 0; m < plan.b; m++) {
                canonicalLanes.push({
                    z: Math.round((band1EndZ + m * baseL) * 1000) / 1000,
                    ori: rotOri,
                    band: 2
                });
            }

            // Seed canonical Z-lanes at all existing front (x, y) positions so previous SKUs'
            // off-grid Z coordinates cannot steal space, intrude into adjacent lanes, or drop a lane.
            const isDoorPriority = (item.position === 'door');
            if (isDoorPriority && doorZoneMinX === null) {
                doorZoneMinX = Math.round(maxX * 1000) / 1000;
            }
            const frontXY = new Map();
            if (isDoorPriority && doorZoneMinX !== null && doorZoneMinX < CL - 0.05) {
                frontXY.set(`${doorZoneMinX.toFixed(3)}|0.000`, { x: doorZoneMinX, y: 0 });
            }
            for (let p = 0; p < candidatePoints.length; p++) {
                const cp = candidatePoints[p];
                const key = `${cp.x.toFixed(3)}|${cp.y.toFixed(3)}`;
                if (!frontXY.has(key)) frontXY.set(key, { x: cp.x, y: cp.y });
            }
            frontXY.forEach(({ x: fx, y: fy }) => {
                for (let lIdx = 0; lIdx < canonicalLanes.length; lIdx++) {
                    const lane = canonicalLanes[lIdx];
                    if (fx + lane.ori.l <= CL + 0.001 && fy + lane.ori.h <= CH + 0.001 &&
                        !this.checkCollision(fx, fy, lane.z, lane.ori.l, lane.ori.h, lane.ori.w) &&
                        (fy <= 0.002 || this.isSupported(fx, fy, lane.z, lane.ori.l, lane.ori.h, lane.ori.w))) {
                        this.addCandidatePoint(candidatePoints, fx, fy, lane.z, CL, CW, CH);
                    }
                }
            });

            const matchCanonicalLane = (zVal) => {
                let bestLane = null;
                let bestDist = 0.008; // 8mm strict snap tolerance prevents cross-lane intrusion
                for (let lIdx = 0; lIdx < canonicalLanes.length; lIdx++) {
                    const d = Math.abs(zVal - canonicalLanes[lIdx].z);
                    if (d < bestDist) {
                        bestDist = d;
                        bestLane = canonicalLanes[lIdx];
                    }
                }
                return bestLane;
            };

            const commitPlacement = (pt, ori, ptIndex) => {
                this.doRecordBoxData(pt, ori, color, item, shapeType, unitWeight, stackable, CL, CW, CH, candidatePoints, ptIndex, boxMeshesData, bandInfo);
                if (!ori.isPrimary) rotatedCount++;
                if (pt.x + ori.l > maxX) maxX = pt.x + ori.l;
                placedCount++;
                totalPlaced++;
                totalPlacedVolume += (ori.l * ori.w * ori.h);
                totalPlacedWeight += unitWeight;
                cogSumX += (pt.x + ori.l / 2) * unitWeight;
                cogSumY += (pt.y + ori.h / 2) * unitWeight;
                cogSumZ += (pt.z + ori.w / 2) * unitWeight;
            };

            while (placedCount < qty) {
                if (enforcePayload && totalPlacedWeight + unitWeight > spec.payload * 1.05) {
                    hitPayloadLimit = true;
                    break;
                }

                let placedThisBox = false;
                this.sortCandidatePoints(candidatePoints);

                // PASS 1: Strict canonical Z-lane & band orientation discipline (eliminates intra-SKU gaps & lane drops)
                // For 'door' priority items, keep them in the front door zone (x >= doorZoneMinX) before falling back in Pass 2.
                for (let i = 0; i < candidatePoints.length; i++) {
                    const pt = candidatePoints[i];
                    if (isDoorPriority && doorZoneMinX !== null && pt.x < doorZoneMinX - 0.01) continue;
                    const lane = matchCanonicalLane(pt.z);
                    if (!lane) continue;

                    const ori = lane.ori;
                    if (this.canPlaceBox(pt, ori, CL, CW, CH, floorOnly, totalPlacedWeight, unitWeight, spec, enforcePayload, doorOpts)) {
                        commitPlacement(pt, ori, i);
                        placedThisBox = true;
                        break;
                    }
                }

                // PASS 2: Fallback for residual door gaps, tight notches, or 3D rotations when canonical lanes are full
                if (!placedThisBox) {
                    for (let i = 0; i < candidatePoints.length; i++) {
                        const pt = candidatePoints[i];

                        let baseOris;
                        if (plan.b === 0) {
                            baseOris = canRotateHoriz ? [primaryOri, rotOri] : [primaryOri];
                        } else if (plan.a === 0) {
                            baseOris = [rotOri, primaryOri];
                        } else if (pt.z >= band1EndZ - 0.02) {
                            baseOris = [rotOri, primaryOri];
                        } else if (pt.z + primaryOri.w <= band1EndZ + 0.02) {
                            baseOris = [primaryOri, rotOri];
                        } else {
                            baseOris = [rotOri, primaryOri];
                        }

                        const oris = extra3DOris.length > 0 ? baseOris.concat(extra3DOris) : baseOris;

                        for (let j = 0; j < oris.length; j++) {
                            const ori = oris[j];
                            if (this.canPlaceBox(pt, ori, CL, CW, CH, floorOnly, totalPlacedWeight, unitWeight, spec, enforcePayload, doorOpts)) {
                                commitPlacement(pt, ori, i);
                                placedThisBox = true;
                                break;
                            }
                        }
                        if (placedThisBox) break;
                    }
                }

                if (!placedThisBox) break;
            }

            const unplaced = qty - placedCount;
            if (unplaced > 0) {
                unplacedItems.push({ ...item, remainingQty: unplaced });
            }
        }

        const physicalContainerVolume = spec.l * spec.w * spec.h;
        const containerVolume = physicalContainerVolume;
        const utilization = ((totalPlacedVolume / containerVolume) * 100).toFixed(1);
        const weightUtilization = ((totalPlacedWeight / spec.payload) * 100).toFixed(1);
        const totalUnplacedCount = unplacedItems.reduce((acc, it) => acc + it.remainingQty, 0);
        const stopReason = totalUnplacedCount === 0 ? 'done' : (hitPayloadLimit ? 'payload' : 'space');

        let cogText = 'Cân đối (Tâm cont)';
        const avgX = totalPlacedWeight > 0 ? (cogSumX / totalPlacedWeight) : (CL / 2);
        const avgY = totalPlacedWeight > 0 ? (cogSumY / totalPlacedWeight) : (CH / 2);
        const avgZ = totalPlacedWeight > 0 ? (cogSumZ / totalPlacedWeight) : 0;

        if (totalPlacedWeight > 0) {
            const ratioX = avgX / spec.l;
            if (ratioX > 0.62) cogText = 'Lệch về phía cửa cont';
            else if (ratioX < 0.38) cogText = 'Lệch về phía đầu cont';
        }

        return {
            placedBoxes: this.placedBoxes.slice(),
            boxMeshesData: boxMeshesData,
            unplacedItems: unplacedItems,
            stats: {
                placed: totalPlaced,
                unplaced: totalUnplacedCount,
                volume: totalPlacedVolume.toFixed(3),
                containerVolume: containerVolume.toFixed(1),
                effectiveDims: { l: CL.toFixed(3), w: CW.toFixed(3), h: CH.toFixed(3) },
                doorDims: { w: doorW.toFixed(3), h: doorH.toFixed(3) },
                margins: { l: marginL, w: marginW, h: marginH },
                enforceDoorClearance: enforceDoorClearance,
                weight: totalPlacedWeight.toFixed(1),
                maxPayload: spec.payload,
                utilization: utilization,
                weightUtilization: weightUtilization,
                cogStatus: cogText,
                cogPos: { x: avgX.toFixed(2), y: avgY.toFixed(2), z: avgZ.toFixed(2) },
                stopReason: stopReason,
                enforcePayload: enforcePayload,
                maxX: maxX.toFixed(3),
                rotatedCount: rotatedCount
            },
            cogPos: { x: avgX, y: avgY, z: avgZ }
        };
    }

    doRecordBoxData(pt, ori, color, item, shapeType, unitWeight, stackable, CL, CW, CH, candidatePoints, ptIndex, boxMeshesData, bandInfo = null) {
        const stepNumber = this.placedBoxes.length + 1;
        const boxRecord = {
            x: pt.x, y: pt.y, z: pt.z,
            l: ori.l, h: ori.h, w: ori.w,
            weight: unitWeight,
            stackable: stackable
        };
        this.placedBoxes.push(boxRecord);
        this.insertSpatialBox(boxRecord);

        boxMeshesData.push({
            step: stepNumber,
            name: item.name,
            x: pt.x, y: pt.y, z: pt.z,
            l: ori.l, h: ori.h, w: ori.w,
            weight: unitWeight,
            color: color,
            shapeType: shapeType,
            stop: item.stop || 'Stop 1'
        });

        candidatePoints.splice(ptIndex, 1);
        this.generateCandidatePointsForBox(candidatePoints, pt.x, pt.y, pt.z, ori.l, ori.h, ori.w, CL, CW, CH, bandInfo);
    }

    showContainer(index) {
        if (!this.multiContainerData || !this.multiContainerData[index]) return null;
        this.activeContainerIdx = index;
        const contData = this.multiContainerData[index];

        // 1. Switch equipment & rebuild container geometry
        this.currentEquipment = contData.type;
        this.buildContainer();

        // 2. Clear current cargo scene group
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

        // 3. Re-create cargo group and 3D meshes for this container
        this.cargoGroup = new THREE.Group();
        this.placedBoxes = contData.placedBoxes.slice();
        this.boxMeshes = [];

        const s = this.scale;
        for (let i = 0; i < contData.boxMeshesData.length; i++) {
            const b = contData.boxMeshesData[i];
            const placedBoxObj = this.placeBox(b.x, b.y, b.z, b.l, b.h, b.w, new THREE.Color(b.color), b.name, s, b.shapeType || 'box', b.step, b.weight);
            this.boxMeshes.push({
                step: b.step,
                mesh: placedBoxObj.mesh,
                edgeLines: placedBoxObj.edgeLines,
                name: b.name,
                x: b.x, y: b.y, z: b.z,
                l: b.l, h: b.h, w: b.w,
                weight: b.weight,
                color: b.color,
                stop: b.stop || 'Stop 1'
            });
        }
        this.scene.add(this.cargoGroup);

        // 4. Rebuild CoG marker for this container
        if (contData.cogPos) {
            const spec = this.containerSpecs[contData.type];
            this.buildCogMarker(contData.cogPos.x, contData.cogPos.y, contData.cogPos.z, spec.l, spec.w, spec.h);
        }

        // 5. Update playback steps
        this.totalSteps = this.boxMeshes.length;
        this.setPlaybackStep(this.totalSteps);

        return contData.stats;
    }

    // Helper: Returns deduplicated boxes overlapping the query bounding region using the spatial hash grid
    getCandidateBoxes(x, y, z, l, h, w) {
        if (!this._spatialGrid) return this.placedBoxes;
        const keys = this.getSpatialKeys(x, y, z, l, h, w);
        const seen = new Set();
        const result = [];
        for (let i = 0; i < keys.length; i++) {
            const bucket = this._spatialGrid.get(keys[i]);
            if (!bucket) continue;
            for (let j = 0; j < bucket.length; j++) {
                const box = bucket[j];
                if (!seen.has(box)) {
                    seen.add(box);
                    result.push(box);
                }
            }
        }
        return result;
    }

    // Prevent tucking boxes under a tiny (2mm-40mm) overhead micro-lip from a previous SKU stagger,
    // which otherwise caps the column early and traps a large hollow vertical void above it.
    hasOverheadMicroLip(x, y, z, l, h, w, CH) {
        const eps = 0.002;
        const queryH = CH - (y + h) + eps;
        if (queryH <= eps) return false;
        const candidates = this.getCandidateBoxes(x, y + h - eps, z, 0.04, queryH, w);
        for (let i = 0; i < candidates.length; i++) {
            const b = candidates[i];
            if (b.y >= y + h - eps &&
                b.x + b.l > x + eps && b.x + b.l <= x + 0.04 &&
                b.z < z + w - eps && b.z + b.w > z + eps) {
                return true;
            }
        }
        return false;
    }

    // Helper: Validates if a box can physically be placed at pt with given orientation
    // floorOnly=true restricts this item to floor (y=0); stackable (on placed boxes) prevents other items from stacking on top.
    canPlaceBox(pt, ori, CL, CW, CH, floorOnly, totalPlacedWeight, unitWeight, spec, enforcePayload = false, doorOpts = null) {
        if (pt.x + ori.l > CL + 0.001) return false;
        if (pt.y + ori.h > CH + 0.001) return false;
        if (pt.z + ori.w > CW / 2 + 0.001) return false;
        if (pt.z < -CW / 2 - 0.001) return false;

        if (floorOnly && pt.y > 0.002) return false;
        if (enforcePayload && totalPlacedWeight + unitWeight > spec.payload * 1.05) return false;

        // ISO Doorway Clearance check:
        // 1) Any single unit must physically fit through doorW × doorH opening
        // 2) Within the doorway steel header beam zone (last 0.50m near doors), stack top must stay <= doorH
        if (doorOpts && doorOpts.enforce) {
            if (ori.h > doorOpts.doorH + 0.001 || ori.w > doorOpts.doorW + 0.001) return false;
            if (pt.x + ori.l > CL - doorOpts.headerZone && pt.y + ori.h > doorOpts.doorH + 0.001) return false;
        }

        if (this.checkCollision(pt.x, pt.y, pt.z, ori.l, ori.h, ori.w)) return false;
        if (!this.isSupported(pt.x, pt.y, pt.z, ori.l, ori.h, ori.w)) return false;
        if (this.hasOverheadMicroLip(pt.x, pt.y, pt.z, ori.l, ori.h, ori.w, CH)) return false;

        return true;
    }

    // Helper: Places box in 3D scene, adds to placedBoxes and meshes, updates candidate points
    doPlaceBox(pt, ori, color, item, s, shapeType, unitWeight, stackable, CL, CW, CH, candidatePoints, ptIndex) {
        const stepNumber = this.placedBoxes.length + 1;
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

        candidatePoints.splice(ptIndex, 1);
        this.generateCandidatePointsForBox(candidatePoints, pt.x, pt.y, pt.z, ori.l, ori.h, ori.w, CL, CW, CH);
    }

    // Physical support check: box at y > 0 must rest securely on floor or boxes below ("Gối đầu" vững chắc, triệt tiêu khe hở khoảng trống)
    isSupported(x, y, z, l, h, w) {
        if (y <= 0.002) return true; // Sits directly on container floor

        let supportedArea = 0;
        const boxBottomArea = l * w;
        const eps = 0.012; // 12mm height tolerance to account for SKU dimension variance

        let maxSupportX = -Infinity;
        let minSupportX = Infinity;

        const candidates = this.getCandidateBoxes(x, y - 0.015, z, l, 0.03, w);
        for (let i = 0; i < candidates.length; i++) {
            const b = candidates[i];
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

        // Require at least 60% bottom surface support to ensure physical stability while fitting notches
        if (supportedArea < boxBottomArea * 0.60) {
            return false;
        }

        // Strict overhang tolerance: allow at most 2.5cm (0.025m) past supporting boxes.
        // Prohibiting protruding "balconies" into empty air ensures the floor space in front
        // is never blocked, completely eliminating vertical chasms/trenches between SKUs with different carton lengths!
        const maxOverhang = 0.025;
        if (maxSupportX > -Infinity && (x + l) > maxSupportX + maxOverhang) {
            return false;
        }

        // Also prevent backward overhang into mid-air
        if (minSupportX < Infinity && x < minSupportX - maxOverhang) {
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

    generateCandidatePointsForBox(pts, x, y, z, l, h, w, CL, CW, CH, bandInfo = null) {
        const hasTwoBands = !!(bandInfo && bandInfo.hasTwoBands);
        const band1EndZ = hasTwoBands ? bandInfo.band1EndZ : null;
        const inBand2 = hasTwoBands && (z >= band1EndZ - 0.015);
        const nextZ = z + w;
        const crossesBand = hasTwoBands && !inBand2 && (nextZ >= band1EndZ - 0.015);

        // 1. In front of the box at the same height
        this.addCandidatePoint(pts, x + l, y, z, CL, CW, CH);
        // 2. On top of the box
        this.addCandidatePoint(pts, x, y + h, z, CL, CW, CH);
        // 3. Beside the box to the right
        this.addCandidatePoint(pts, x, y, nextZ, CL, CW, CH);
        // 4. In front of the box on the floor (y = 0)
        this.addCandidatePoint(pts, x + l, 0, z, CL, CW, CH);
        // 5 & 6. Band-isolated left wall / band seam points (prevents cross-band X projection)
        const bandStartZ = (hasTwoBands && inBand2) ? band1EndZ : (-CW / 2);
        this.addCandidatePoint(pts, x + l, 0, bandStartZ, CL, CW, CH);
        this.addCandidatePoint(pts, x, y + h, bandStartZ, CL, CW, CH);
        // 7. Top-front corner
        this.addCandidatePoint(pts, x + l, y + h, z, CL, CW, CH);
        // 8. In front on the floor to the right (do not project Band 1 X across into Band 2)
        if (!crossesBand) {
            this.addCandidatePoint(pts, x + l, 0, nextZ, CL, CW, CH);
        }
        // 9. If placed above floor, also generate floor point beneath if clear
        if (y > 0.01) {
            this.addCandidatePoint(pts, x, 0, z, CL, CW, CH);
            this.addCandidatePoint(pts, x, 0, bandStartZ, CL, CW, CH);
        }
    }

    sortCandidatePoints(pts) {
        // Strictly transitive weak ordering: 5mm X-buckets -> 5mm Y-buckets -> Z left-to-right.
        // Prevents non-transitive comparator cycles from scrambling TimSort and leaving mid-block gaps.
        pts.sort((a, b) => {
            const qxA = Math.round(a.x * 200);
            const qxB = Math.round(b.x * 200);
            if (qxA !== qxB) return qxA - qxB;
            const qyA = Math.round(a.y * 200);
            const qyB = Math.round(b.y * 200);
            if (qyA !== qyB) return qyA - qyB;
            return a.z - b.z;
        });
    }

    checkCollision(x, y, z, l, h, w) {
        const eps = 0.002; // 2mm margin
        const candidates = this.getCandidateBoxes(x, y, z, l, h, w);
        for (let i = 0; i < candidates.length; i++) {
            const box = candidates[i];
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

    // Synchronous camera positioning & single-frame render for PDF snapshot capture
    setCameraImmediate(preset) {
        if (!this.camera || !this.renderer || !this.scene) return;
        const spec = this.containerSpecs[this.currentEquipment] || this.containerSpecs['40hc'];
        const s = this.scale;
        const L = spec.l * s, H = spec.h * s;

        let pos, look;
        if (preset === 'top') {
            pos = new THREE.Vector3(L / 2, Math.max(L * 0.95, H * 3.8), 0.01);
            look = new THREE.Vector3(L / 2, 0, 0);
        } else if (preset === 'side') {
            pos = new THREE.Vector3(L / 2, H * 0.48, Math.max(L * 0.95, 260));
            look = new THREE.Vector3(L / 2, H * 0.45, 0);
        } else {
            pos = new THREE.Vector3(L * 1.15, H * 1.38, L * 0.72);
            look = new THREE.Vector3(L / 2, H * 0.42, 0);
        }

        this.camera.position.copy(pos);
        if (this.controls) {
            this.controls.target.copy(look);
            this.controls.update();
        } else {
            this.camera.lookAt(look);
        }
        this.renderer.render(this.scene, this.camera);
    }

    // Build warehouse-ready per-container SKU loading manifest (ordered back-to-front by loading step)
    getContainerSkuSummary(contIndex) {
        if (!this.multiContainerData || !this.multiContainerData[contIndex]) return [];
        const boxes = this.multiContainerData[contIndex].boxMeshesData || [];
        const map = new Map();

        for (let i = 0; i < boxes.length; i++) {
            const b = boxes[i];
            let entry = map.get(b.name);
            if (!entry) {
                entry = {
                    name: b.name,
                    color: b.color || '#dc2626',
                    stop: b.stop || 'Stop 1',
                    qty: 0,
                    weightTotal: 0,
                    cbmTotal: 0,
                    minX: Infinity,
                    maxX: -Infinity,
                    firstStep: b.step,
                    lastStep: b.step,
                    zBuckets: new Set(),
                    yBuckets: new Set(),
                    oriCounts: new Map(),
                    oriLanes: new Map(),
                    sampleL: b.l,
                    sampleW: b.w,
                    sampleH: b.h
                };
                map.set(b.name, entry);
            }
            entry.qty++;
            entry.weightTotal += (parseFloat(b.weight) || 0);
            entry.cbmTotal += (b.l * b.w * b.h);
            if (b.x < entry.minX) entry.minX = b.x;
            if (b.x + b.l > entry.maxX) entry.maxX = b.x + b.l;
            if (b.step < entry.firstStep) entry.firstStep = b.step;
            if (b.step > entry.lastStep) entry.lastStep = b.step;
            const zKey = Math.round(b.z * 33); // ~3cm bucket
            const yKey = Math.round(b.y * 33);
            entry.zBuckets.add(zKey);
            entry.yBuckets.add(yKey);

            const oriKey = `${Math.round(b.l * 1000)}x${Math.round(b.w * 1000)}`;
            entry.oriCounts.set(oriKey, (entry.oriCounts.get(oriKey) || 0) + 1);
            if (!entry.oriLanes.has(oriKey)) entry.oriLanes.set(oriKey, new Set());
            entry.oriLanes.get(oriKey).add(zKey);
        }

        const list = [];
        map.forEach(e => {
            const oriEntries = Array.from(e.oriCounts.entries()).sort((a, b) => b[1] - a[1]);
            let oriLabel = 'Thuận chiều';
            if (oriEntries.length >= 2) {
                const lanesA = e.oriLanes.get(oriEntries[0][0])?.size || 0;
                const lanesB = e.oriLanes.get(oriEntries[1][0])?.size || 0;
                oriLabel = `Kết hợp (${lanesA} + ${lanesB} làn)`;
            } else if (oriEntries.length === 1) {
                const [lMm, wMm] = oriEntries[0][0].split('x').map(Number);
                oriLabel = (wMm > lMm + 10) ? 'Xoay ngang 90°' : 'Thuận chiều';
            }

            const baseL = Math.max(e.sampleL, e.sampleW);
            const baseW = Math.min(e.sampleL, e.sampleW);
            list.push({
                name: e.name,
                color: e.color,
                stop: e.stop,
                qty: e.qty,
                weightTotal: e.weightTotal,
                cbmTotal: e.cbmTotal,
                minX: isFinite(e.minX) ? e.minX : 0,
                maxX: isFinite(e.maxX) ? e.maxX : 0,
                firstStep: e.firstStep,
                lastStep: e.lastStep,
                lanes: e.zBuckets.size,
                layers: e.yBuckets.size,
                oriLabel: oriLabel,
                dimLcm: parseFloat((baseL * 100).toFixed(2)),
                dimWcm: parseFloat((baseW * 100).toFixed(2)),
                dimHcm: parseFloat((e.sampleH * 100).toFixed(2))
            });
        });

        list.sort((a, b) => a.firstStep - b.firstStep);
        return list;
    }

    // Capture 3 crisp 3D views (Isometric, Top, Side) + SKU manifest for every active container
    captureAllContainersReportData() {
        if (!this.multiContainerData || this.multiContainerData.length === 0) return [];
        const prevIdx = this.activeContainerIdx || 0;
        const prevCamPos = this.camera ? this.camera.position.clone() : null;
        const prevTarget = this.controls ? this.controls.target.clone() : null;
        const prevHeightCut = this.heightCut;
        const canCaptureImg = !!(this.canvas && this.renderer && typeof this.canvas.toDataURL === 'function');

        const reportContainers = [];
        for (let idx = 0; idx < this.multiContainerData.length; idx++) {
            const cont = this.multiContainerData[idx];
            const snapshots = { isometric: '', top: '', side: '' };

            if (canCaptureImg) {
                this.showContainer(idx);
                if (this.heightCut < 0.999) {
                    this.setHeightCut(1.0);
                }
                this.setCameraImmediate('isometric');
                snapshots.isometric = this.canvas.toDataURL('image/jpeg', 0.92);
                this.setCameraImmediate('top');
                snapshots.top = this.canvas.toDataURL('image/jpeg', 0.92);
                this.setCameraImmediate('side');
                snapshots.side = this.canvas.toDataURL('image/jpeg', 0.92);
            }

            reportContainers.push({
                index: idx,
                type: cont.type,
                name: cont.name,
                stats: cont.stats,
                skuManifest: this.getContainerSkuSummary(idx),
                snapshots: snapshots
            });
        }

        // Restore previous interactive view state seamlessly
        if (canCaptureImg) {
            this.showContainer(prevIdx);
            if (prevHeightCut !== undefined && prevHeightCut < 0.999) {
                this.setHeightCut(prevHeightCut);
            }
            if (prevCamPos && this.camera) this.camera.position.copy(prevCamPos);
            if (prevTarget && this.controls) {
                this.controls.target.copy(prevTarget);
                this.controls.update();
            }
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        }

        return reportContainers;
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
