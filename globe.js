// ===== Three.js 3D Globe Animation =====
(function() {
    const container = document.getElementById('globe-container');
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 300;

    const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Globe parameters
    const GLOBE_RADIUS = 140;
    const PARTICLE_COUNT = 1500;
    const CONNECTION_DISTANCE = 25;

    // Create particles on sphere surface
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const particlePositions = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        // Fibonacci sphere distribution for even spacing
        const phi = Math.acos(1 - 2 * (i + 0.5) / PARTICLE_COUNT);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;

        const x = GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta);
        const y = GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta);
        const z = GLOBE_RADIUS * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        particlePositions.push(new THREE.Vector3(x, y, z));

        // Cyan to purple gradient based on position
        const t = (y + GLOBE_RADIUS) / (2 * GLOBE_RADIUS);
        colors[i * 3] = 0 + t * 0.49;        // R
        colors[i * 3 + 1] = 0.9 - t * 0.67;  // G
        colors[i * 3 + 2] = 1;                 // B

        sizes[i] = Math.random() * 2 + 1;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader material for particles
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: renderer.getPixelRatio() }
        },
        vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vAlpha;
            uniform float uTime;
            uniform float uPixelRatio;
            
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                float dist = length(mvPosition.xyz);
                vAlpha = smoothstep(400.0, 150.0, dist);
                gl_PointSize = size * uPixelRatio * (200.0 / dist);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                float d = length(gl_PointCoord - vec2(0.5));
                if (d > 0.5) discard;
                float alpha = smoothstep(0.5, 0.1, d) * vAlpha * 0.8;
                gl_FragColor = vec4(vColor, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Create connections (lines between nearby particles)
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = [];
    const lineColors = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
            const dist = particlePositions[i].distanceTo(particlePositions[j]);
            if (dist < CONNECTION_DISTANCE) {
                linePositions.push(
                    particlePositions[i].x, particlePositions[i].y, particlePositions[i].z,
                    particlePositions[j].x, particlePositions[j].y, particlePositions[j].z
                );
                const alpha = 1 - dist / CONNECTION_DISTANCE;
                lineColors.push(
                    0, 0.9 * alpha, 1 * alpha,
                    0, 0.9 * alpha, 1 * alpha
                );
            }
        }
    }

    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Add inner glow sphere
    const glowGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 0.98, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 }
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            uniform float uTime;
            void main() {
                float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
                vec3 color = mix(vec3(0.0, 0.9, 1.0), vec3(0.49, 0.23, 0.93), 0.5 + 0.5 * sin(uTime * 0.5));
                gl_FragColor = vec4(color, intensity * 0.15);
            }
        `,
        transparent: true,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });

    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glowSphere);

    // Floating particles around the globe
    const floatingCount = 200;
    const floatingGeometry = new THREE.BufferGeometry();
    const floatingPositions = new Float32Array(floatingCount * 3);
    const floatingVelocities = [];

    for (let i = 0; i < floatingCount; i++) {
        const radius = GLOBE_RADIUS * (1.2 + Math.random() * 0.8);
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;

        floatingPositions[i * 3] = radius * Math.sin(theta) * Math.cos(phi);
        floatingPositions[i * 3 + 1] = radius * Math.sin(theta) * Math.sin(phi);
        floatingPositions[i * 3 + 2] = radius * Math.cos(theta);

        floatingVelocities.push({
            x: (Math.random() - 0.5) * 0.2,
            y: (Math.random() - 0.5) * 0.2,
            z: (Math.random() - 0.5) * 0.2
        });
    }

    floatingGeometry.setAttribute('position', new THREE.BufferAttribute(floatingPositions, 3));

    const floatingMaterial = new THREE.PointsMaterial({
        color: 0x00e5ff,
        size: 1.5,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const floatingParticles = new THREE.Points(floatingGeometry, floatingMaterial);
    scene.add(floatingParticles);

    // Mouse interaction
    const mouse = { x: 0, y: 0 };
    const targetRotation = { x: 0, y: 0 };

    document.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    // Animation
    let time = 0;
    function animate() {
        requestAnimationFrame(animate);
        time += 0.005;

        // Auto rotation + mouse interaction
        targetRotation.y = time * 0.3 + mouse.x * 0.3;
        targetRotation.x = mouse.y * 0.2;

        particles.rotation.y += (targetRotation.y - particles.rotation.y) * 0.02;
        particles.rotation.x += (targetRotation.x - particles.rotation.x) * 0.02;
        lines.rotation.y = particles.rotation.y;
        lines.rotation.x = particles.rotation.x;
        glowSphere.rotation.y = particles.rotation.y;
        glowSphere.rotation.x = particles.rotation.x;

        // Update floating particles
        const fPos = floatingParticles.geometry.attributes.position.array;
        for (let i = 0; i < floatingCount; i++) {
            fPos[i * 3] += floatingVelocities[i].x;
            fPos[i * 3 + 1] += floatingVelocities[i].y;
            fPos[i * 3 + 2] += floatingVelocities[i].z;

            const dist = Math.sqrt(
                fPos[i * 3] ** 2 + fPos[i * 3 + 1] ** 2 + fPos[i * 3 + 2] ** 2
            );

            if (dist > GLOBE_RADIUS * 2 || dist < GLOBE_RADIUS * 1.1) {
                floatingVelocities[i].x *= -1;
                floatingVelocities[i].y *= -1;
                floatingVelocities[i].z *= -1;
            }
        }
        floatingParticles.geometry.attributes.position.needsUpdate = true;
        floatingParticles.rotation.y = time * 0.1;

        // Update uniforms
        particleMaterial.uniforms.uTime.value = time;
        glowMaterial.uniforms.uTime.value = time;

        renderer.render(scene, camera);
    }

    animate();

    // Handle resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        particleMaterial.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    });
})();
