// ===== Main Application Controller for CBM3 =====
document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialize 3D Hero and Simulation
    let simulation = null;
    try {
        if (typeof initHeroGlobe === 'function') {
            initHeroGlobe();
        }
        simulation = new ContainerSimulation('simCanvas', 'simViewport');
    } catch (e) {
        console.error('Three.js initialization error:', e);
    }

    // 2. Equipment Specifications Data
    const equipmentData = {
        '20dc': {
            dimStr: '5.898m × 2.352m × 2.393m',
            payload: '28,200 kg',
            label: "20' Dry Container (20DC)"
        },
        '40dc': {
            dimStr: '12.032m × 2.352m × 2.393m',
            payload: '26,680 kg',
            label: "40' Dry Container (40DC)"
        },
        '40hc': {
            dimStr: '12.032m × 2.352m × 2.698m',
            payload: '26,460 kg',
            label: "40' High Cube (40HC)"
        },
        'truck': {
            dimStr: '13.600m × 2.480m × 2.700m',
            payload: '24,000 kg',
            label: 'Xe tải / Truck (13.6m)'
        },
        'custom': {
            dimStr: '6.000m × 2.400m × 2.400m',
            payload: '20,000 kg',
            label: 'Tùy chỉnh / Custom Space'
        }
    };

    let selectedEquipment = '20dc';

    // Equipment selector buttons
    const eqButtons = document.querySelectorAll('.equipment-btn');
    const eqDimDisplay = document.getElementById('eqDimDisplay');
    const eqPayloadDisplay = document.getElementById('eqPayload');
    const simEquipmentLabel = document.getElementById('simEquipmentLabel');

    eqButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            eqButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            selectedEquipment = btn.getAttribute('data-equipment');
            const data = equipmentData[selectedEquipment];
            if (data) {
                if (eqDimDisplay) eqDimDisplay.textContent = data.dimStr;
                if (eqPayloadDisplay) eqPayloadDisplay.textContent = data.payload;
                if (simEquipmentLabel) simEquipmentLabel.textContent = data.label;
                if (simulation) {
                    simulation.setEquipment(selectedEquipment);
                }
            }
        });
    });

    // 3. Calculator Tab Selector (Load Planner vs CBM Calculator)
    const selectorTabs = document.querySelectorAll('.selector-tab');
    const loadPlannerSection = document.getElementById('loadPlanner');
    const simulationSection = document.getElementById('simulation');
    const cbmSection = document.getElementById('cbmCalc');

    selectorTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            selectorTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetTab = tab.getAttribute('data-tab');
            if (targetTab === 'load-planner') {
                if (loadPlannerSection) loadPlannerSection.style.display = 'block';
                if (simulationSection) simulationSection.style.display = 'block';
                if (cbmSection) cbmSection.style.display = 'none';
            } else if (targetTab === 'cbm-calc') {
                if (loadPlannerSection) loadPlannerSection.style.display = 'none';
                if (simulationSection) simulationSection.style.display = 'none';
                if (cbmSection) cbmSection.style.display = 'block';
            }
        });
    });

    // 4. Cargo Items Calculation & Dynamic Management
    const cargoCardsContainer = document.getElementById('cargoCards');
    const addCargoBtn = document.getElementById('addCargoBtn');
    let nextCargoId = 2;

    const defaultColors = ['#dc2626', '#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0891b2'];

    function setupCargoCardListeners(card) {
        const widthInput = card.querySelector('.cargo-width');
        const lengthInput = card.querySelector('.cargo-length');
        const heightInput = card.querySelector('.cargo-height');
        const qtyInput = card.querySelector('.cargo-qty');
        const weightInput = card.querySelector('.cargo-weight');

        const totalWeightSpan = card.querySelector('[id^="totalWeight"]');
        const totalVolSpan = card.querySelector('[id^="totalVol"]');

        const calcCard = () => {
            const w = parseFloat(widthInput?.value) || 0;
            const l = parseFloat(lengthInput?.value) || 0;
            const h = parseFloat(heightInput?.value) || 0;
            const qty = parseInt(qtyInput?.value) || 0;
            const weight = parseFloat(weightInput?.value) || 0;

            const totalWt = (weight * qty).toLocaleString('en-US', { maximumFractionDigits: 1 });
            const totalVol = ((w * l * h * qty) / 1000000).toFixed(3);

            if (totalWeightSpan) totalWeightSpan.textContent = totalWt;
            if (totalVolSpan) totalVolSpan.textContent = totalVol;

            updateOverallSummary();
        };

        [widthInput, lengthInput, heightInput, qtyInput, weightInput].forEach(inp => {
            if (inp) inp.addEventListener('input', calcCard);
        });

        // Pill switches for type & stackable
        const radioPills = card.querySelectorAll('.radio-pill');
        radioPills.forEach(pill => {
            pill.addEventListener('click', () => {
                radioPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const radio = pill.querySelector('input');
                if (radio) radio.checked = true;
            });
        });

        const checkPill = card.querySelector('.checkbox-pill');
        if (checkPill) {
            checkPill.addEventListener('click', () => {
                const cb = checkPill.querySelector('input');
                if (cb) {
                    cb.checked = !cb.checked;
                    checkPill.classList.toggle('active', cb.checked);
                }
            });
        }

        // Rotation lock buttons
        const rotButtons = card.querySelectorAll('.rot-btn');
        rotButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                rotButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Delete button
        const deleteBtn = card.querySelector('.action-btn.delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const totalCards = cargoCardsContainer.querySelectorAll('.cargo-card').length;
                if (totalCards > 1) {
                    card.remove();
                    updateOverallSummary();
                } else {
                    alert(document.documentElement.lang === 'vi' 
                        ? 'Cần ít nhất một hàng hóa trong danh sách!' 
                        : 'At least one cargo item is required!');
                }
            });
        }

        // Duplicate button
        const duplicateBtn = card.querySelector('.action-btn[title="Nhân bản"], .action-btn[title="Duplicate"]');
        if (duplicateBtn) {
            duplicateBtn.addEventListener('click', () => {
                duplicateCargoCard(card);
            });
        }

        calcCard();
    }

    function updateOverallSummary() {
        const cards = cargoCardsContainer.querySelectorAll('.cargo-card');
        let totalItems = 0;
        let totalVolume = 0;
        let totalWeight = 0;

        cards.forEach(card => {
            const w = parseFloat(card.querySelector('.cargo-width')?.value) || 0;
            const l = parseFloat(card.querySelector('.cargo-length')?.value) || 0;
            const h = parseFloat(card.querySelector('.cargo-height')?.value) || 0;
            const qty = parseInt(card.querySelector('.cargo-qty')?.value) || 0;
            const weight = parseFloat(card.querySelector('.cargo-weight')?.value) || 0;

            totalItems += qty;
            totalVolume += (w * l * h * qty) / 1000000;
            totalWeight += weight * qty;
        });

        const summaryVol = document.getElementById('summaryVolume');
        const summaryWt = document.getElementById('summaryWeight');
        const summaryItems = document.getElementById('summaryItems');

        if (summaryVol) summaryVol.textContent = `${totalVolume.toFixed(3)} m³`;
        if (summaryWt) summaryWt.textContent = `${totalWeight.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`;
        if (summaryItems) summaryItems.textContent = totalItems.toString();
    }

    function duplicateCargoCard(cardToClone) {
        const clone = cardToClone.cloneNode(true);
        const cardId = nextCargoId++;
        clone.setAttribute('data-cargo-id', cardId);

        // Update name
        const nameInput = clone.querySelector('.cargo-name');
        if (nameInput) {
            nameInput.value = `${nameInput.value} (Copy)`;
        }

        // Update radio names to avoid collision
        clone.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.name = `type${cardId}`;
        });

        // Update spans ids
        const wtSpan = clone.querySelector('[id^="totalWeight"]');
        if (wtSpan) wtSpan.id = `totalWeight${cardId}`;
        const volSpan = clone.querySelector('[id^="totalVol"]');
        if (volSpan) volSpan.id = `totalVol${cardId}`;

        // Cycle color
        const colorInput = clone.querySelector('.color-picker');
        if (colorInput) {
            colorInput.value = defaultColors[cardId % defaultColors.length];
        }

        cargoCardsContainer.appendChild(clone);
        setupCargoCardListeners(clone);
        updateOverallSummary();
    }

    // Attach listeners to initial cargo cards
    document.querySelectorAll('.cargo-card').forEach(card => {
        setupCargoCardListeners(card);
    });

    // Add Cargo Button
    if (addCargoBtn) {
        addCargoBtn.addEventListener('click', () => {
            const firstCard = cargoCardsContainer.querySelector('.cargo-card');
            if (firstCard) {
                duplicateCargoCard(firstCard);
            }
        });
    }

    // 5. Gather Cargo Data and Run 3D Simulation
    function getCargoData() {
        const cards = cargoCardsContainer.querySelectorAll('.cargo-card');
        const items = [];

        cards.forEach(card => {
            const name = card.querySelector('.cargo-name')?.value || 'Hàng hóa';
            const width = parseFloat(card.querySelector('.cargo-width')?.value) || 50;
            const length = parseFloat(card.querySelector('.cargo-length')?.value) || 60;
            const height = parseFloat(card.querySelector('.cargo-height')?.value) || 40;
            const qty = parseInt(card.querySelector('.cargo-qty')?.value) || 1;
            const weight = parseFloat(card.querySelector('.cargo-weight')?.value) || 10;
            const color = card.querySelector('.color-picker')?.value || '#dc2626';

            items.push({ name, width, length, height, qty, weight, color });
        });

        return items;
    }

    function run3DLoadPlan() {
        const loadingOverlay = document.getElementById('simLoading');
        const loadingFill = document.getElementById('loadingFill');
        const simSection = document.getElementById('simulation');

        // Smooth scroll to 3D Simulation
        if (simSection) {
            simSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        if (loadingOverlay && loadingFill) {
            loadingOverlay.style.display = 'flex';
            loadingFill.style.width = '0%';

            let progress = 0;
            const interval = setInterval(() => {
                progress += 25;
                loadingFill.style.width = `${progress}%`;
                if (progress >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        loadingOverlay.style.display = 'none';

                        // Run packing algorithm
                        if (simulation) {
                            const cargoItems = getCargoData();
                            const selectedAlgo = document.querySelector('input[name="algorithm"]:checked')?.value || 'best-balance';
                            const result = simulation.packCargo(cargoItems, selectedAlgo);

                            // Update HUD
                            const hudPlaced = document.getElementById('hudPlaced');
                            const hudVol = document.getElementById('hudVolume');
                            const hudWt = document.getElementById('hudWeight');
                            const hudUtil = document.getElementById('hudUtil');

                            if (hudPlaced) hudPlaced.textContent = result.placed;
                            if (hudVol) hudVol.textContent = `${result.volume} m³`;
                            if (hudWt) hudWt.textContent = `${result.weight} kg`;
                            if (hudUtil) hudUtil.textContent = `${result.utilization}%`;

                            // Update Result Table
                            const resPlaced = document.getElementById('resultPlaced');
                            const resVol = document.getElementById('resultVolume');
                            const resMass = document.getElementById('resultMass');
                            const resUtil = document.getElementById('resultUtil');
                            const simResults = document.getElementById('simResults');

                            if (resPlaced) resPlaced.textContent = result.placed;
                            if (resVol) resVol.textContent = `${result.volume} m³`;
                            if (resMass) resMass.textContent = `${result.weight} kg`;
                            if (resUtil) resUtil.textContent = `${result.utilization}%`;
                            if (simResults) simResults.style.display = 'block';
                        }
                    }, 300);
                }
            }, 120);
        }
    }

    // Sticky Bar Buttons
    const planBtn = document.getElementById('planBtn');
    if (planBtn) {
        planBtn.addEventListener('click', run3DLoadPlan);
    }

    const summaryBtn = document.getElementById('summaryBtn');
    if (summaryBtn) {
        summaryBtn.addEventListener('click', () => {
            const simResults = document.getElementById('simResults');
            if (simResults && simResults.style.display !== 'none') {
                simResults.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                run3DLoadPlan();
            }
        });
    }

    // Initial Plan execution on first load
    setTimeout(() => {
        if (simulation) {
            const cargoItems = getCargoData();
            simulation.packCargo(cargoItems, 'best-balance');
        }
    }, 500);

    // 6. View Controls (Operational, Realistic, X-Ray)
    const viewButtons = document.querySelectorAll('[data-view-mode]');
    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.getAttribute('data-view-mode');
            if (simulation) {
                simulation.setViewMode(mode);
            }
        });
    });

    // 7. Camera Controls (Isometric, Door, Top, Side, Reset)
    const cameraButtons = document.querySelectorAll('[data-camera]');
    cameraButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            cameraButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const preset = btn.getAttribute('data-camera');
            if (simulation) {
                simulation.setCamera(preset);
            }
        });
    });

    // 8. Height Section Slider
    const heightToggle = document.getElementById('heightSectionToggle');
    const heightSlider = document.getElementById('heightSlider');
    const heightLabel = document.getElementById('heightLabel');

    if (heightToggle && heightSlider) {
        heightToggle.addEventListener('change', () => {
            heightSlider.disabled = !heightToggle.checked;
            if (!heightToggle.checked && simulation) {
                simulation.setHeightCut(100);
                heightSlider.value = 100;
                if (heightLabel) {
                    heightLabel.textContent = document.documentElement.lang === 'vi' ? 'Toàn bộ' : 'Full view';
                }
            }
        });

        heightSlider.addEventListener('input', () => {
            const val = parseInt(heightSlider.value);
            if (heightLabel) {
                heightLabel.textContent = `${val}%`;
            }
            if (simulation) {
                simulation.setHeightCut(val);
            }
        });
    }

    // 9. Fullscreen Toggle
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn && simulation) {
        fullscreenBtn.addEventListener('click', () => {
            simulation.toggleFullscreen();
        });
    }

    // 10. Simple CBM Calculator
    const cbmCalcBtn = document.getElementById('cbmCalcBtn');
    if (cbmCalcBtn) {
        cbmCalcBtn.addEventListener('click', () => {
            const w = parseFloat(document.getElementById('cbmWidth')?.value) || 0;
            const l = parseFloat(document.getElementById('cbmLength')?.value) || 0;
            const h = parseFloat(document.getElementById('cbmHeight')?.value) || 0;
            const qty = parseInt(document.getElementById('cbmQty')?.value) || 1;

            const unitCbm = (w * l * h) / 1000000;
            const totalCbm = unitCbm * qty;

            const unitSpan = document.getElementById('cbmPerUnit');
            const totalSpan = document.getElementById('cbmTotal');

            if (unitSpan) unitSpan.textContent = `${unitCbm.toFixed(3)} m³`;
            if (totalSpan) totalSpan.textContent = `${totalCbm.toFixed(3)} m³`;
        });
    }

    // 11. Mobile Menu Toggle
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
        });

        navMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
            });
        });
    }

    // 12. Listen to language changes to update dynamic text
    window.addEventListener('languageChanged', (e) => {
        const lang = e.detail.lang;
        if (heightLabel && !heightToggle?.checked) {
            heightLabel.textContent = lang === 'vi' ? 'Toàn bộ' : 'Full view';
        }
    });
});
