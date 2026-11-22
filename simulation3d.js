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
        const wallOpacity = this.viewMode === 'xray' ? 0.08 : (this.viewMode === 'operational' ? 0.15 : 0.5);
        const wallColor = this.viewMode === 'xray' ? 0x00e5ff : 0x4a6a8a;

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
            color: this.viewMode === 'xray' ? 0x00e5ff : 0x5a8ab5,
            transparent: true,
            opacity: 0.6
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
            color: 0x3d5a7a,
            transparent: true,
            opacity: 0.6,
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
        const hingeMat = new THREE.MeshLambertMaterial({ color: 0x778899 });

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
            color: 0x4a6a8a,
            transparent: true,
            opacity: this.viewMode === 'xray' ? 0.05 : 0.3
        });

        for (let x = 5; x < L; x += 8) {
            const ridgeGeo = new THREE.BoxGeometry(1, H * 0.9, 0.5);
            const ridge1 = new THREE.Mesh(ridgeGeo, ridgeMat);
            ridge1.position.set(x, H * 0.45, -W / 2 - 0.3);
            this.container3D.add(ridge1);

            const ridge2 = new THREE.Mesh(ridgeGeo, ridgeMat);
            ridge2.position.set(x, H * 0.45, W / 2 + 0.3);
            this.container3D.add(ridge2);
        }
    }

    // ===== Pack cargo into container using simple 3D bin-packing =====
    packCargo(cargoItems, algorithm = 'best-balance') {
        this.clearCargo();

        const spec = this.containerSpecs[this.currentEquipment];
        const s = this.scale;
        const CL = spec.l, CW = spec.w, CH = spec.h;

        this.cargoGroup = new THREE.Group();
        this.placedBoxes = [];

        let totalPlaced = 0;
        let totalVolume = 0;
        let totalWeight = 0;

        for (const item of cargoItems) {
            const bw = item.width / 100;   // cm to m
            const bl = item.length / 100;
            const bh = item.height / 100;
            const boxVol = bw * bl * bh;
            const color = new THREE.Color(item.color || '#dc2626');

            // Simple layer-based packing
            let placed = 0;
            let y = 0;

            while (placed < item.qty && y + bh <= CH + 0.001) {
                let z = -CW / 2;
                while (placed < item.qty && z + bw <= CW / 2 + 0.001) {
                    let x = 0;
                    while (placed < item.qty && x + bl <= CL + 0.001) {
                        // Check collision with placed boxes
                        if (!this.checkCollision(x, y, z, bl, bh, bw)) {
                            this.placeBox(x, y, z, bl, bh, bw, color, item.name, s);
                            this.placedBoxes.push({ x, y, z, l: bl, h: bh, w: bw });
                            placed++;
                            totalPlaced++;
                            totalVolume += boxVol;
                            totalWeight += item.weight;
                        }
                        x += bl + 0.001;
                    }
                    z += bw + 0.001;
                }
                y += bh + 0.001;
            }
        }

        this.scene.add(this.cargoGroup);

        const containerVolume = CL * CW * CH;
        const utilization = (totalVolume / containerVolume * 100).toFixed(1);

        return {
            placed: totalPlaced,
            volume: totalVolume.toFixed(3),
            weight: totalWeight.toFixed(1),
            utilization: utilization
        };
    }

    checkCollision(x, y, z, l, h, w) {
        for (const box of this.placedBoxes) {
            if (x < box.x + box.l && x + l > box.x &&
                y < box.y + box.h && y + h > box.y &&
                z < box.z + box.w && z + w > box.z) {
                return true;
            }
        }
        return false;
    }

    placeBox(x, y, z, l, h, w, color, name, s) {
        const geo = new THREE.BoxGeometry(l * s - 0.5, h * s - 0.5, w * s - 0.5);

        let mat;
        if (this.viewMode === 'xray') {
            mat = new THREE.MeshLambertMaterial({
                color: color,
                transparent: true,
                opacity: 0.3,
                wireframe: false
            });
        } else {
            mat = new THREE.MeshLambertMaterial({
                color: color,
                transparent: false
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
        mesh.userData = { name, x, y, z, l, h, w };

        this.cargoGroup.add(mesh);

        // Add edges for each box
        const edgesGeo = new THREE.EdgesGeometry(geo);
        const edgesMat = new THREE.LineBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: this.viewMode === 'xray' ? 0.3 : 0.15
        });
        const edgeLines = new THREE.LineSegments(edgesGeo, edgesMat);
        edgeLines.position.copy(mesh.position);
        this.cargoGroup.add(edgeLines);
    }

    clearCargo() {
        if (this.cargoGroup) {
            this.scene.remove(this.cargoGroup);
            this.cargoGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
            this.cargoGroup = null;
        }
        this.placedBoxes = [];
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

// ===== Hero Mini Globe =====
function initHeroGlobe() {
    const container = document.getElementById('heroGlobe');
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1726);
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 500);
    camera.position.set(0, 0, 100);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Mini container wireframe
    const boxGeo = new THREE.BoxGeometry(50, 20, 20);
    const edges = new THREE.EdgesGeometry(boxGeo);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.8 });
    const wireBox = new THREE.LineSegments(edges, wireMat);
    scene.add(wireBox);

    // Mini cargo boxes inside
    const cargoColors = [0xdc2626, 0xf59e0b, 0x2563eb, 0x16a34a];
    for (let i = 0; i < 12; i++) {
        const size = 5 + Math.random() * 4;
        const geo = new THREE.BoxGeometry(size, size * 0.7, size * 0.8);
        const mat = new THREE.MeshBasicMaterial({
            color: cargoColors[i % cargoColors.length],
            transparent: true,
            opacity: 0.7
        });
        const box = new THREE.Mesh(geo, mat);
        box.position.set(
            -20 + (i % 4) * 12,
            -6 + Math.floor(i / 4) * 7,
            -4 + (i % 2) * 8
        );
        scene.add(box);
    }

    // Floating particles
    const pCount = 50;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
        pPos[i * 3] = (Math.random() - 0.5) * 120;
        pPos[i * 3 + 1] = (Math.random() - 0.5) * 80;
        pPos[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ color: 0x06b6d4, size: 1.5, transparent: true, opacity: 0.5 });
    scene.add(new THREE.Points(pGeo, pMat));

    // Ambient
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    function animate() {
        requestAnimationFrame(animate);
        wireBox.rotation.y += 0.005;
        wireBox.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}
