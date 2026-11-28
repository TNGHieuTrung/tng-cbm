// ===== Main Application Controller for CBM3 (Intelligent Best Fit & Live 3D Simulation) =====
document.addEventListener('DOMContentLoaded', () => {

    let liveSimTimeout = null;
    let toastTimer = null;

    function showToast(message, isError = false) {
        let toast = document.getElementById('tngToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'tngToast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '84px',
            right: '24px',
            zIndex: '99999',
            padding: '12px 18px',
            borderRadius: '999px',
            fontSize: '13px',
            fontWeight: '600',
            color: '#f8fafc',
            background: isError ? 'rgba(220, 38, 38, 0.95)' : 'rgba(15, 23, 42, 0.95)',
            border: isError ? '1px solid #f87171' : '1px solid rgba(45, 212, 191, 0.6)',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.35)',
            opacity: '1',
            transition: 'opacity 0.25s ease',
            pointerEvents: 'none'
        });
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
        }, 4000);
    }

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

    // 2. Equipment Specifications Data (including ISO door clearances)
    const equipmentData = {
        '20dc': {
            dimStr: '5.898m × 2.352m × 2.393m',
            doorStr: '2.340m × 2.280m',
            payload: '28,200 kg',
            label: "20' Dry Container (20DC)",
            maxVol: 33.2,
            usableVol: 28.5,
            maxL: 5.898,
            maxW: 2.352,
            maxH: 2.393,
            doorW: 2.340,
            doorH: 2.280
        },
        '40dc': {
            dimStr: '12.032m × 2.352m × 2.393m',
            doorStr: '2.340m × 2.280m',
            payload: '26,680 kg',
            label: "40' Dry Container (40DC)",
            maxVol: 67.7,
            usableVol: 59.0,
            maxL: 12.032,
            maxW: 2.352,
            maxH: 2.393,
            doorW: 2.340,
            doorH: 2.280
        },
        '40hc': {
            dimStr: '12.032m × 2.352m × 2.698m',
            doorStr: '2.340m × 2.585m',
            payload: '26,460 kg',
            label: "40' High Cube (40HC)",
            maxVol: 76.3,
            usableVol: 68.5,
            maxL: 12.032,
            maxW: 2.352,
            maxH: 2.698,
            doorW: 2.340,
            doorH: 2.585
        },
        '45hc': {
            dimStr: '13.556m × 2.352m × 2.698m',
            doorStr: '2.340m × 2.585m',
            payload: '27,800 kg',
            label: "45' High Cube (45HC)",
            maxVol: 86.0,
            usableVol: 76.5,
            maxL: 13.556,
            maxW: 2.352,
            maxH: 2.698,
            doorW: 2.340,
            doorH: 2.585
        },
        'custom': {
            dimStr: '6.000m × 2.400m × 2.400m',
            doorStr: '2.340m × 2.290m',
            payload: '20,000 kg',
            label: 'Tùy chỉnh / Custom Space',
            maxVol: 34.5,
            usableVol: 30.0,
            maxL: 6.000,
            maxW: 2.400,
            maxH: 2.400,
            doorW: 2.340,
            doorH: 2.290
        }
    };

    let selectedEquipment = '20dc';

    const eqButtons = document.querySelectorAll('.equipment-btn');
    const eqDimDisplay = document.getElementById('eqDimDisplay');
    const eqDoorDisplay = document.getElementById('eqDoorDisplay');
    const eqPayloadDisplay = document.getElementById('eqPayload');
    const simEquipmentLabel = document.getElementById('simEquipmentLabel');
    const autoFitToggle = document.getElementById('autoFitToggle');
    const enforcePayloadToggle = document.getElementById('enforcePayloadToggle');
    const enforceDoorClearanceToggle = document.getElementById('enforceDoorClearanceToggle');
    const marginLSlider = document.getElementById('marginLSlider');
    const marginWSlider = document.getElementById('marginWSlider');
    const marginHSlider = document.getElementById('marginHSlider');
    const marginLVal = document.getElementById('marginLVal');
    const marginWVal = document.getElementById('marginWVal');
    const marginHVal = document.getElementById('marginHVal');
    const effectiveDimDisplay = document.getElementById('effectiveDimDisplay');
    const shrinkPresetBtns = document.querySelectorAll('.shrink-preset-btn');
    const marginCustomInput = document.getElementById('marginCustomInput');
    const smartFleetBar = document.getElementById('smartFleetBar');
    const smartFleetPills = document.getElementById('smartFleetPills');
    const btnIncludeAll = document.getElementById('btnIncludeAll');
    const btnExcludeAll = document.getElementById('btnExcludeAll');
    const activeSkuCountBadge = document.getElementById('activeSkuCountBadge');

    const isPayloadEnforced = () => (enforcePayloadToggle ? enforcePayloadToggle.checked : false);
    const isDoorClearanceEnforced = () => (enforceDoorClearanceToggle ? enforceDoorClearanceToggle.checked : true);
    const getPackingOptions = () => ({
        enforcePayload: isPayloadEnforced(),
        enforceDoorClearance: isDoorClearanceEnforced(),
        marginL: parseFloat(marginLSlider?.value) || 0,
        marginW: parseFloat(marginWSlider?.value) || 0,
        marginH: parseFloat(marginHSlider?.value) || 0
    });

    function updateEffectiveDimsUI() {
        const data = equipmentData[selectedEquipment] || equipmentData['40hc'];
        const opts = getPackingOptions();
        if (marginLVal) marginLVal.textContent = `${opts.marginL}%`;
        if (marginWVal) marginWVal.textContent = `${opts.marginW}%`;
        if (marginHVal) marginHVal.textContent = `${opts.marginH}%`;

        const effL = (data.maxL * (1 - opts.marginL / 100)).toFixed(3);
        const effW = (data.maxW * (1 - opts.marginW / 100)).toFixed(3);
        const effH = (data.maxH * (1 - opts.marginH / 100)).toFixed(3);
        if (effectiveDimDisplay) {
            const hasMargin = (opts.marginL > 0 || opts.marginW > 0 || opts.marginH > 0);
            effectiveDimDisplay.textContent = hasMargin
                ? `Khả dụng: ${effL}m × ${effW}m × ${effH}m`
                : `Khả dụng: ${effL}m × ${effW}m × ${effH}m (100%)`;
        }
        if (eqDoorDisplay && data.doorStr) {
            eqDoorDisplay.textContent = data.doorStr;
        }
        // Highlight matching preset chip & sync custom % box when all 3 axes match
        let matchedPreset = false;
        shrinkPresetBtns.forEach(btn => {
            const presetVal = parseFloat(btn.getAttribute('data-margin'));
            const match = (opts.marginL === presetVal && opts.marginW === presetVal && opts.marginH === presetVal);
            btn.classList.toggle('active', match);
            if (match) matchedPreset = true;
        });
        if (marginCustomInput && document.activeElement !== marginCustomInput) {
            if (opts.marginL === opts.marginW && opts.marginW === opts.marginH) {
                marginCustomInput.value = opts.marginL;
            }
            const customBox = marginCustomInput.closest('.shrink-custom-box');
            if (customBox) customBox.classList.toggle('active', !matchedPreset && (opts.marginL > 0 || opts.marginW > 0 || opts.marginH > 0));
        }
    }

    const bestFitBanner = document.getElementById('bestFitBanner');
    const bestFitMsg = document.getElementById('bestFitMsg');
    const btnApplyFit = document.getElementById('btnApplyFit');
    const btnAutoSplitBanner = document.getElementById('btnAutoSplitBanner');
    const btnAddCont = document.getElementById('btnAddCont');
    const btnAutoSplit = document.getElementById('btnAutoSplit');
    const containerTabsBar = document.getElementById('containerTabsBar');
    const containerTabsList = document.getElementById('containerTabsList');

    let activeContainers = ['20dc'];
    let lastSmartFleetPlans = [];
    window.simulation = simulation;

    function selectEquipment(eqKey, isManual = false) {
        if (!equipmentData[eqKey]) return;

        if (isManual && autoFitToggle && autoFitToggle.checked) {
            // User manually clicks an equipment -> switch auto-fit toggle off or keep notice
            autoFitToggle.checked = false;
        }

        selectedEquipment = eqKey;
        if (activeContainers.length <= 1) {
            activeContainers = [eqKey];
        }

        eqButtons.forEach(b => {
            if (b.getAttribute('data-equipment') === eqKey) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        const data = equipmentData[eqKey];
        if (eqDimDisplay) eqDimDisplay.textContent = data.dimStr;
        if (eqDoorDisplay && data.doorStr) eqDoorDisplay.textContent = data.doorStr;
        if (eqPayloadDisplay) eqPayloadDisplay.textContent = data.payload;
        if (simEquipmentLabel) simEquipmentLabel.textContent = data.label;
        updateEffectiveDimsUI();

        const hudContainerTitle = document.getElementById('hudContainerTitle');
        if (hudContainerTitle) hudContainerTitle.textContent = `Container 1 (${data.label.split(' ')[0]})`;

        const resultHeader = document.getElementById('resultContainerHeader');
        if (resultHeader) resultHeader.textContent = `Container 1 (${data.label}) - Kết quả tải trọng & xếp dỡ`;

        if (simulation) {
            simulation.setEquipment(eqKey);
            triggerLiveSimulation();
        }
    }

    eqButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const eq = btn.getAttribute('data-equipment');
            selectEquipment(eq, true);
        });
    });

    if (autoFitToggle) {
        autoFitToggle.addEventListener('change', () => {
            evaluateBestFitAndSync();
        });
    }

    if (enforcePayloadToggle) {
        enforcePayloadToggle.addEventListener('change', () => {
            evaluateBestFitAndSync();
        });
    }

    if (enforceDoorClearanceToggle) {
        enforceDoorClearanceToggle.addEventListener('change', () => {
            triggerLiveSimulation();
        });
    }

    [marginLSlider, marginWSlider, marginHSlider].forEach(slider => {
        if (slider) {
            slider.addEventListener('input', () => {
                updateEffectiveDimsUI();
                triggerLiveSimulation();
            });
        }
    });

    shrinkPresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.getAttribute('data-margin') || '0';
            if (marginLSlider) marginLSlider.value = val;
            if (marginWSlider) marginWSlider.value = val;
            if (marginHSlider) marginHSlider.value = val;
            if (marginCustomInput) marginCustomInput.value = val;
            updateEffectiveDimsUI();
            triggerLiveSimulation();
        });
    });

    if (marginCustomInput) {
        marginCustomInput.addEventListener('input', () => {
            let v = parseFloat(marginCustomInput.value);
            if (isNaN(v)) return;
            v = Math.max(0, Math.min(15, v));
            if (marginLSlider) marginLSlider.value = v;
            if (marginWSlider) marginWSlider.value = v;
            if (marginHSlider) marginHSlider.value = v;
            updateEffectiveDimsUI();
            triggerLiveSimulation();
        });
    }

    updateEffectiveDimsUI();

    // 3. Calculator Tab Selector (Load Planner vs CBM Calculator vs Supplier Audit)
    const selectorTabs = document.querySelectorAll('.selector-tab');
    const loadPlannerSection = document.getElementById('loadPlanner');
    const simulationSection = document.getElementById('simulation');
    const cbmSection = document.getElementById('cbmCalc');
    const supplierAuditSectionEl = document.getElementById('supplierAuditSection');

    selectorTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            selectorTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const targetTab = tab.getAttribute('data-tab');
            if (targetTab === 'load-planner') {
                if (loadPlannerSection) loadPlannerSection.style.display = 'block';
                if (simulationSection) simulationSection.style.display = 'block';
                if (cbmSection) cbmSection.style.display = 'none';
                if (supplierAuditSectionEl) supplierAuditSectionEl.style.display = 'none';
            } else if (targetTab === 'cbm-calc') {
                if (loadPlannerSection) loadPlannerSection.style.display = 'none';
                if (simulationSection) simulationSection.style.display = 'none';
                if (cbmSection) cbmSection.style.display = 'block';
                if (supplierAuditSectionEl) supplierAuditSectionEl.style.display = 'none';
            } else if (targetTab === 'supplier-audit') {
                if (loadPlannerSection) loadPlannerSection.style.display = 'none';
                if (cbmSection) cbmSection.style.display = 'none';
                if (supplierAuditSectionEl) supplierAuditSectionEl.style.display = 'block';
                if (simulationSection) simulationSection.style.display = 'block';
                if (simulation && typeof simulation.onResize === 'function') {
                    setTimeout(() => simulation.onResize(), 50);
                }
            }
        });
    });

    // 4. Cargo Items Calculation, Unit Conversion (cm/mm/in) & Dynamic Management
    const cargoCardsContainer = document.getElementById('cargoCards');
    const addCargoBtn = document.getElementById('addCargoBtn');
    const dimUnitSwitcher = document.getElementById('dimUnitSwitcher');
    let nextCargoId = 3;
    const defaultColors = ['#dc2626', '#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#0891b2'];

    let currentDimUnit = 'cm';
    const UNIT_TO_CM = { cm: 1, mm: 0.1, in: 2.54 };
    const UNIT_SHORT = { cm: 'cm', mm: 'mm', in: 'in' };

    function toCm(val, unit = currentDimUnit) {
        const n = parseFloat(val);
        if (isNaN(n) || n <= 0) return 0;
        return n * (UNIT_TO_CM[unit] || 1);
    }

    function fromCm(cmVal, unit = currentDimUnit) {
        const n = parseFloat(cmVal);
        if (isNaN(n) || n <= 0) return 0;
        if (unit === 'mm') return parseFloat((n * 10).toFixed(1));
        if (unit === 'in') return parseFloat((n / 2.54).toFixed(2));
        return parseFloat(n.toFixed(2));
    }

    function updateDimUnitLabels() {
        const u = UNIT_SHORT[currentDimUnit] || 'cm';
        const isEn = document.documentElement.lang === 'en';
        cargoCardsContainer.querySelectorAll('.cargo-card').forEach(card => {
            const wLbl = card.querySelector('.cargo-width')?.closest('.dim-input')?.querySelector('label');
            const lLbl = card.querySelector('.cargo-length')?.closest('.dim-input')?.querySelector('label');
            const hLbl = card.querySelector('.cargo-height')?.closest('.dim-input')?.querySelector('label');
            if (wLbl) wLbl.textContent = isEn ? `Width (${u})` : `Rộng (${u})`;
            if (lLbl) lLbl.textContent = isEn ? `Length (${u})` : `Dài (${u})`;
            if (hLbl) hLbl.textContent = isEn ? `Height (${u})` : `Cao (${u})`;
        });
        const thL = document.querySelector('#cargoDataTable th[data-i18n="app.table.length"]');
        const thW = document.querySelector('#cargoDataTable th[data-i18n="app.table.width"]');
        const thH = document.querySelector('#cargoDataTable th[data-i18n="app.table.height"]');
        if (thL) thL.textContent = isEn ? `L (${u})` : `D (${u})`;
        if (thW) thW.textContent = isEn ? `W (${u})` : `R (${u})`;
        if (thH) thH.textContent = isEn ? `H (${u})` : `C (${u})`;
    }

    function switchDimUnit(newUnit) {
        if (!UNIT_TO_CM[newUnit] || newUnit === currentDimUnit) return;
        const oldUnit = currentDimUnit;
        currentDimUnit = newUnit;

        cargoCardsContainer.querySelectorAll('.cargo-card').forEach(card => {
            ['.cargo-width', '.cargo-length', '.cargo-height'].forEach(sel => {
                const inp = card.querySelector(sel);
                if (inp) {
                    const cmVal = toCm(inp.value, oldUnit);
                    if (cmVal > 0) inp.value = fromCm(cmVal, newUnit);
                }
            });
            const wCm = toCm(card.querySelector('.cargo-width')?.value, newUnit);
            const lCm = toCm(card.querySelector('.cargo-length')?.value, newUnit);
            const hCm = toCm(card.querySelector('.cargo-height')?.value, newUnit);
            const qty = parseInt(card.querySelector('.cargo-qty')?.value) || 0;
            const cVolSpan = card.querySelector('[id^="totalVol"]');
            if (cVolSpan) cVolSpan.textContent = ((wCm * lCm * hCm * qty) / 1000000).toFixed(3);
        });

        if (dimUnitSwitcher) {
            dimUnitSwitcher.querySelectorAll('.unit-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-unit') === newUnit);
            });
        }
        updateDimUnitLabels();
        syncCardsToTable();
        updateOverallSummary();
        const labelMap = { cm: 'centimet (cm)', mm: 'milimet (mm)', in: 'inch (in)' };
        showToast(`Đã chuyển đổi đơn vị kích thước sang ${labelMap[newUnit] || newUnit}`);
    }

    if (dimUnitSwitcher) {
        dimUnitSwitcher.querySelectorAll('.unit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                switchDimUnit(btn.getAttribute('data-unit'));
            });
        });
    }

    function setupCargoCardListeners(card, silent = false) {
        const widthInput = card.querySelector('.cargo-width');
        const lengthInput = card.querySelector('.cargo-length');
        const heightInput = card.querySelector('.cargo-height');
        const qtyInput = card.querySelector('.cargo-qty');
        const weightInput = card.querySelector('.cargo-weight');

        const totalWeightSpan = card.querySelector('[id^="totalWeight"]');
        const totalVolSpan = card.querySelector('[id^="totalVol"]');

        const calcCard = (shouldSync = true) => {
            const w = toCm(widthInput?.value, currentDimUnit);
            const l = toCm(lengthInput?.value, currentDimUnit);
            const h = toCm(heightInput?.value, currentDimUnit);
            const qty = parseInt(qtyInput?.value) || 0;
            const rawWt = parseFloat(weightInput?.value);
            const weight = isNaN(rawWt) ? 0 : Math.max(0, rawWt);

            const typeVal = card.querySelector('input[type="radio"]:checked')?.value || 'box';
            const totalWt = (weight * qty).toLocaleString('en-US', { maximumFractionDigits: 1 });
            const rawVol = (typeVal === 'fabric')
                ? (Math.PI * Math.pow(Math.max(w, h) / 2, 2) * l * qty) / 1000000
                : (w * l * h * qty) / 1000000;
            const totalVol = rawVol.toFixed(3);

            if (totalWeightSpan) totalWeightSpan.textContent = totalWt;
            if (totalVolSpan) totalVolSpan.textContent = totalVol;

            if (shouldSync) {
                updateOverallSummary();
                evaluateBestFitAndSync();
            }
        };

        [widthInput, lengthInput, heightInput, qtyInput, weightInput].forEach(inp => {
            if (inp) inp.addEventListener('input', () => {
                const isFabric = card.querySelector('input[type="radio"]:checked')?.value === 'fabric';
                if (isFabric && inp === widthInput && heightInput) {
                    heightInput.value = widthInput.value;
                }
                calcCard(true);
            });
        });

        const syncCardTypeLabels = (typeVal) => {
            const u = UNIT_SHORT[currentDimUnit] || 'cm';
            const wLbl = card.querySelector('.cargo-width')?.closest('.dim-input')?.querySelector('label');
            const lLbl = card.querySelector('.cargo-length')?.closest('.dim-input')?.querySelector('label');
            const hLbl = card.querySelector('.cargo-height')?.closest('.dim-input')?.querySelector('label');
            if (typeVal === 'fabric') {
                if (lLbl) lLbl.textContent = `Khổ vải L (${u})`;
                if (wLbl) wLbl.textContent = `Đường kính Ø (${u})`;
                if (hLbl) hLbl.textContent = `Đường kính (${u})`;
                if (widthInput && heightInput) heightInput.value = widthInput.value;
            } else {
                const isEn = document.documentElement.lang === 'en';
                if (wLbl) wLbl.textContent = isEn ? `Width (${u})` : `Rộng (${u})`;
                if (lLbl) lLbl.textContent = isEn ? `Length (${u})` : `Dài (${u})`;
                if (hLbl) hLbl.textContent = isEn ? `Height (${u})` : `Cao (${u})`;
            }
        };

        // Pill switches for type & stackable
        const radioPills = card.querySelectorAll('.radio-pill');
        radioPills.forEach(pill => {
            pill.addEventListener('click', () => {
                radioPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const radio = pill.querySelector('input');
                if (radio) {
                    radio.checked = true;
                    syncCardTypeLabels(radio.value);
                    calcCard(true);
                }
            });
        });

        // Include-in-loading checkbox toggle (instant what-if exclusion without deleting SKU)
        const includeCb = card.querySelector('.cargo-include');
        if (includeCb) {
            card.classList.toggle('cargo-excluded', !includeCb.checked);
            includeCb.addEventListener('change', () => {
                card.classList.toggle('cargo-excluded', !includeCb.checked);
                updateOverallSummary();
                evaluateBestFitAndSync();
            });
        }

        // 2-way stacking pill switches: Cho đè lên (.cargo-stackable) & Chỉ đặt sàn (.cargo-floor-only)
        const stackCb = card.querySelector('.cargo-stackable') || card.querySelector('.stack-pill input') || card.querySelector('.checkbox-pill input');
        const stackPill = card.querySelector('.stack-pill') || card.querySelector('.checkbox-pill');
        if (stackCb && stackPill) {
            stackPill.classList.toggle('active', stackCb.checked);
            stackCb.addEventListener('change', () => {
                stackPill.classList.toggle('active', stackCb.checked);
                evaluateBestFitAndSync();
            });
        }

        const floorCb = card.querySelector('.cargo-floor-only');
        const floorPill = card.querySelector('.floor-pill');
        if (floorCb && floorPill) {
            floorPill.classList.toggle('active', floorCb.checked);
            floorCb.addEventListener('change', () => {
                floorPill.classList.toggle('active', floorCb.checked);
                evaluateBestFitAndSync();
            });
        }

        // Priority position selector (normal / rear / door)
        const posSelect = card.querySelector('.cargo-position');
        if (posSelect) {
            posSelect.addEventListener('change', () => {
                evaluateBestFitAndSync();
            });
        }

        // Color picker
        const colorPicker = card.querySelector('.color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('input', () => {
                triggerLiveSimulation();
            });
        }

        // Rotation selector
        const rotSelect = card.querySelector('.cargo-rotation');
        if (rotSelect) {
            rotSelect.addEventListener('change', () => {
                evaluateBestFitAndSync();
                triggerLiveSimulation();
            });
        }

        // Legacy rotation lock buttons (if present)
        const rotButtons = card.querySelectorAll('.rot-btn');
        rotButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                rotButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (rotSelect) {
                    rotSelect.value = btn.title.includes('Khóa') ? 'locked' : 'fit';
                }
                triggerLiveSimulation();
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
                    evaluateBestFitAndSync();
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

        calcCard(!silent);
    }

    function updateOverallSummary() {
        const cards = cargoCardsContainer.querySelectorAll('.cargo-card');
        let totalItems = 0;
        let totalVolume = 0;
        let totalWeight = 0;
        let activeSkus = 0;

        cards.forEach(card => {
            const incCb = card.querySelector('.cargo-include');
            const isIncluded = incCb ? incCb.checked : true;
            if (!isIncluded) return;
            activeSkus++;

            const w = toCm(card.querySelector('.cargo-width')?.value, currentDimUnit);
            const l = toCm(card.querySelector('.cargo-length')?.value, currentDimUnit);
            const h = toCm(card.querySelector('.cargo-height')?.value, currentDimUnit);
            const qty = parseInt(card.querySelector('.cargo-qty')?.value) || 0;
            const rawWt = parseFloat(card.querySelector('.cargo-weight')?.value);
            const weight = isNaN(rawWt) ? 0 : Math.max(0, rawWt);

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
        if (activeSkuCountBadge) {
            activeSkuCountBadge.textContent = `${activeSkus}/${cards.length} mã đang xếp`;
        }
    }

    if (btnIncludeAll) {
        btnIncludeAll.addEventListener('click', () => {
            cargoCardsContainer.querySelectorAll('.cargo-card').forEach(card => {
                const cb = card.querySelector('.cargo-include');
                if (cb) cb.checked = true;
                card.classList.remove('cargo-excluded');
            });
            updateOverallSummary();
            syncCardsToTable();
            evaluateBestFitAndSync();
        });
    }

    if (btnExcludeAll) {
        btnExcludeAll.addEventListener('click', () => {
            cargoCardsContainer.querySelectorAll('.cargo-card').forEach(card => {
                const cb = card.querySelector('.cargo-include');
                if (cb) cb.checked = false;
                card.classList.add('cargo-excluded');
            });
            updateOverallSummary();
            syncCardsToTable();
            evaluateBestFitAndSync();
        });
    }

    function duplicateCargoCard(cardToClone, silent = false) {
        const clone = cardToClone.cloneNode(true);
        const cardId = nextCargoId++;
        clone.setAttribute('data-cargo-id', cardId);

        const nameInput = clone.querySelector('.cargo-name');
        if (nameInput) {
            nameInput.value = `${nameInput.value} (Copy)`;
        }

        clone.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.name = `type${cardId}`;
        });

        const wtSpan = clone.querySelector('[id^="totalWeight"]');
        if (wtSpan) wtSpan.id = `totalWeight${cardId}`;
        const volSpan = clone.querySelector('[id^="totalVol"]');
        if (volSpan) volSpan.id = `totalVol${cardId}`;

        const colorInput = clone.querySelector('.color-picker');
        if (colorInput) {
            colorInput.value = defaultColors[cardId % defaultColors.length];
        }

        const origRot = cardToClone.querySelector('.cargo-rotation')?.value;
        const cloneRot = clone.querySelector('.cargo-rotation');
        if (cloneRot && origRot) {
            cloneRot.value = origRot;
        }

        const origPos = cardToClone.querySelector('.cargo-position')?.value;
        const clonePos = clone.querySelector('.cargo-position');
        if (clonePos && origPos) {
            clonePos.value = origPos;
        }

        const cloneInc = clone.querySelector('.cargo-include');
        if (cloneInc) cloneInc.checked = true;
        clone.classList.remove('cargo-excluded');

        cargoCardsContainer.appendChild(clone);
        setupCargoCardListeners(clone, silent);
        if (!silent) {
            updateOverallSummary();
            evaluateBestFitAndSync();
        }
    }

    document.querySelectorAll('.cargo-card').forEach(card => {
        setupCargoCardListeners(card);
    });

    // Dual-View Management (Cards vs Classic Table view)
    const cargoTableView = document.getElementById('cargoTableView');
    const cargoTableBody = document.getElementById('cargoTableBody');
    const viewButtons = document.querySelectorAll('.cargo-view-toggle .view-btn');
    const btnAddTableRow = document.getElementById('btnAddTableRow');
    const btnClearAllCargo = document.getElementById('btnClearAllCargo');

    function syncCardsToTable() {
        if (!cargoTableBody) return;
        cargoTableBody.innerHTML = '';
        const cards = cargoCardsContainer.querySelectorAll('.cargo-card');

        cards.forEach((card, idx) => {
            const cardId = card.getAttribute('data-cargo-id');
            const includeChecked = card.querySelector('.cargo-include')?.checked !== false;
            const name = card.querySelector('.cargo-name')?.value || `Hàng hóa ${idx + 1}`;
            const w = parseFloat(card.querySelector('.cargo-width')?.value) || 50;
            const l = parseFloat(card.querySelector('.cargo-length')?.value) || 60;
            const h = parseFloat(card.querySelector('.cargo-height')?.value) || 40;
            const qty = parseInt(card.querySelector('.cargo-qty')?.value) || 1;
            const rawWt = parseFloat(card.querySelector('.cargo-weight')?.value);
            const wt = isNaN(rawWt) ? 0 : Math.max(0, rawWt);
            const color = card.querySelector('.color-picker')?.value || '#dc2626';
            const stackChecked = (card.querySelector('.cargo-stackable') || card.querySelector('.checkbox-pill input'))?.checked !== false;
            const floorChecked = card.querySelector('.cargo-floor-only')?.checked === true;
            const rotVal = card.querySelector('.cargo-rotation')?.value || 'fit';
            const posVal = card.querySelector('.cargo-position')?.value || 'normal';
            const currentStop = card.dataset.stop || 'Stop 1';

            const totalWt = (wt * qty).toLocaleString('en-US', { maximumFractionDigits: 1 });
            const totalCbm = ((toCm(w, currentDimUnit) * toCm(l, currentDimUnit) * toCm(h, currentDimUnit) * qty) / 1000000).toFixed(3);

            const tr = document.createElement('tr');
            tr.setAttribute('data-card-id', cardId);
            if (!includeChecked) tr.classList.add('row-excluded');
            tr.innerHTML = `
                <td style="text-align:center;"><input type="checkbox" class="tbl-include" ${includeChecked ? 'checked' : ''} title="Tính mã này vào lần xếp"></td>
                <td>${idx + 1}</td>
                <td><input type="color" class="tbl-color" value="${color}"></td>
                <td><input type="text" class="tbl-name" value="${name}"></td>
                <td><input type="number" class="tbl-length" value="${l}" min="1" step="any"></td>
                <td><input type="number" class="tbl-width" value="${w}" min="1" step="any"></td>
                <td><input type="number" class="tbl-height" value="${h}" min="1" step="any"></td>
                <td><input type="number" class="tbl-qty" value="${qty}" min="1"></td>
                <td><input type="number" class="tbl-weight" value="${wt}" min="0" step="0.1"></td>
                <td class="tbl-tot-wt">${totalWt}</td>
                <td class="tbl-tot-cbm">${totalCbm}</td>
                <td style="text-align:center;"><input type="checkbox" class="tbl-stack" ${stackChecked ? 'checked' : ''} title="Cho đè lên trên"></td>
                <td style="text-align:center;"><input type="checkbox" class="tbl-floor" ${floorChecked ? 'checked' : ''} title="Chỉ đặt sát sàn"></td>
                <td>
                    <select class="tbl-rotation select-sm" style="font-size:12px; padding:3px 6px;">
                        <option value="fit" ${rotVal === 'fit' ? 'selected' : ''}>🔄 Fit dọc/ngang</option>
                        <option value="garment" ${rotVal === 'garment' ? 'selected' : ''}>👔 May mặc (Hạn chế)</option>
                        <option value="locked" ${rotVal === 'locked' ? 'selected' : ''}>🔒 Khóa xoay</option>
                        <option value="all" ${rotVal === 'all' ? 'selected' : ''}>📦 Xoay 3D</option>
                    </select>
                </td>
                <td>
                    <select class="tbl-stop">
                        <option value="Stop 1" ${currentStop === 'Stop 1' ? 'selected' : ''}>Stop 1 (Sâu nhất)</option>
                        <option value="Stop 2" ${currentStop === 'Stop 2' ? 'selected' : ''}>Stop 2</option>
                        <option value="Stop 3" ${currentStop === 'Stop 3' ? 'selected' : ''}>Stop 3</option>
                        <option value="Stop 4" ${currentStop === 'Stop 4' ? 'selected' : ''}>Stop 4</option>
                        <option value="Stop 5" ${currentStop === 'Stop 5' ? 'selected' : ''}>Stop 5 (Cửa cont)</option>
                    </select>
                </td>
                <td>
                    <select class="tbl-position">
                        <option value="normal" ${posVal === 'normal' ? 'selected' : ''}>📋 Theo thứ tự</option>
                        <option value="rear" ${posVal === 'rear' ? 'selected' : ''}>⬅️ Sát vách trong</option>
                        <option value="door" ${posVal === 'door' ? 'selected' : ''}>🚪 Sát cửa cont</option>
                    </select>
                </td>
                <td style="text-align:center;">
                    <button class="tbl-del-btn" title="Xóa dòng"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;

            const incCheckbox = tr.querySelector('.tbl-include');
            if (incCheckbox) {
                incCheckbox.addEventListener('change', () => {
                    const cInc = card.querySelector('.cargo-include');
                    if (cInc) cInc.checked = incCheckbox.checked;
                    card.classList.toggle('cargo-excluded', !incCheckbox.checked);
                    tr.classList.toggle('row-excluded', !incCheckbox.checked);
                    updateOverallSummary();
                    evaluateBestFitAndSync();
                });
            }

            const floorCheckbox = tr.querySelector('.tbl-floor');
            if (floorCheckbox) {
                floorCheckbox.addEventListener('change', () => {
                    const cFloor = card.querySelector('.cargo-floor-only');
                    const cPill = card.querySelector('.floor-pill');
                    if (cFloor) cFloor.checked = floorCheckbox.checked;
                    if (cPill) cPill.classList.toggle('active', floorCheckbox.checked);
                    evaluateBestFitAndSync();
                });
            }

            const posSelect = tr.querySelector('.tbl-position');
            if (posSelect) {
                posSelect.addEventListener('change', () => {
                    const cPos = card.querySelector('.cargo-position');
                    if (cPos) cPos.value = posSelect.value;
                    evaluateBestFitAndSync();
                });
            }

            const rotSelect = tr.querySelector('.tbl-rotation');
            if (rotSelect) {
                rotSelect.addEventListener('change', () => {
                    const cRot = card.querySelector('.cargo-rotation');
                    if (cRot) cRot.value = rotSelect.value;
                    evaluateBestFitAndSync();
                });
            }

            const stopSelect = tr.querySelector('.tbl-stop');
            if (stopSelect) {
                stopSelect.addEventListener('change', () => {
                    card.dataset.stop = stopSelect.value;
                    evaluateBestFitAndSync();
                });
            }

            // Row input listeners to sync back to corresponding card
            const bindRowInput = (sel, cardSel, isVal = true, isCheck = false) => {
                const inp = tr.querySelector(sel);
                if (!inp) return;
                inp.addEventListener('input', () => {
                    const cInp = card.querySelector(cardSel);
                    if (cInp) {
                        if (isCheck) {
                            cInp.checked = inp.checked;
                            const checkPill = card.querySelector('.stack-pill') || card.querySelector('.checkbox-pill');
                            if (checkPill) checkPill.classList.toggle('active', inp.checked);
                        } else if (isVal) {
                            cInp.value = inp.value;
                        }
                    }
                    const wVal = toCm(tr.querySelector('.tbl-width').value, currentDimUnit);
                    const lVal = toCm(tr.querySelector('.tbl-length').value, currentDimUnit);
                    const hVal = toCm(tr.querySelector('.tbl-height').value, currentDimUnit);
                    const qVal = parseInt(tr.querySelector('.tbl-qty').value) || 0;
                    const wtVal = parseFloat(tr.querySelector('.tbl-weight').value) || 0;

                    tr.querySelector('.tbl-tot-wt').textContent = (wtVal * qVal).toLocaleString('en-US', { maximumFractionDigits: 1 });
                    tr.querySelector('.tbl-tot-cbm').textContent = ((wVal * lVal * hVal * qVal) / 1000000).toFixed(3);

                    // Update card's displayed values
                    const cWtSpan = card.querySelector('[id^="totalWeight"]');
                    const cVolSpan = card.querySelector('[id^="totalVol"]');
                    if (cWtSpan) cWtSpan.textContent = tr.querySelector('.tbl-tot-wt').textContent;
                    if (cVolSpan) cVolSpan.textContent = tr.querySelector('.tbl-tot-cbm').textContent;

                    updateOverallSummary();
                    evaluateBestFitAndSync();
                });
            };

            bindRowInput('.tbl-name', '.cargo-name');
            bindRowInput('.tbl-width', '.cargo-width');
            bindRowInput('.tbl-length', '.cargo-length');
            bindRowInput('.tbl-height', '.cargo-height');
            bindRowInput('.tbl-qty', '.cargo-qty');
            bindRowInput('.tbl-weight', '.cargo-weight');
            bindRowInput('.tbl-color', '.color-picker');
            bindRowInput('.tbl-stack', '.cargo-stackable', false, true);

            // Row delete
            tr.querySelector('.tbl-del-btn').addEventListener('click', () => {
                const totalCards = cargoCardsContainer.querySelectorAll('.cargo-card').length;
                if (totalCards > 1) {
                    card.remove();
                    tr.remove();
                    updateOverallSummary();
                    evaluateBestFitAndSync();
                    syncCardsToTable();
                } else {
                    alert('Cần ít nhất một hàng hóa trong danh sách!');
                }
            });

            cargoTableBody.appendChild(tr);
        });
    }

    viewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            viewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.getAttribute('data-view');
            if (view === 'table') {
                syncCardsToTable();
                if (cargoCardsContainer) cargoCardsContainer.style.display = 'none';
                if (addCargoBtn) addCargoBtn.style.display = 'none';
                if (cargoTableView) cargoTableView.style.display = 'block';
            } else {
                if (cargoCardsContainer) cargoCardsContainer.style.display = 'grid';
                if (addCargoBtn) addCargoBtn.style.display = 'block';
                if (cargoTableView) cargoTableView.style.display = 'none';
            }
        });
    });

    if (btnAddTableRow) {
        btnAddTableRow.addEventListener('click', () => {
            const firstCard = cargoCardsContainer.querySelector('.cargo-card');
            if (firstCard) {
                duplicateCargoCard(firstCard);
                syncCardsToTable();
            }
        });
    }

    if (btnClearAllCargo) {
        btnClearAllCargo.addEventListener('click', () => {
            if (confirm('Bạn có chắc muốn xóa tất cả danh sách hàng hóa và tạo lại từ đầu?')) {
                const cards = cargoCardsContainer.querySelectorAll('.cargo-card');
                for (let i = 1; i < cards.length; i++) {
                    cards[i].remove();
                }
                const first = cards[0];
                first.querySelector('.cargo-name').value = 'Hàng hóa 1';
                first.querySelector('.cargo-length').value = '60';
                first.querySelector('.cargo-width').value = '50';
                first.querySelector('.cargo-height').value = '40';
                first.querySelector('.cargo-qty').value = '50';
                first.querySelector('.cargo-weight').value = '15';
                updateOverallSummary();
                evaluateBestFitAndSync();
                syncCardsToTable();
            }
        });
    }

    if (addCargoBtn) {
        addCargoBtn.addEventListener('click', () => {
            const firstCard = cargoCardsContainer.querySelector('.cargo-card');
            if (firstCard) {
                duplicateCargoCard(firstCard);
                syncCardsToTable();
            }
        });
    }

    // 5. Gather Cargo Data from Form
    function getCargoData(includeExcluded = false) {
        const cards = cargoCardsContainer.querySelectorAll('.cargo-card');
        const items = [];

        cards.forEach(card => {
            const incCb = card.querySelector('.cargo-include');
            const included = incCb ? incCb.checked : true;
            if (!includeExcluded && !included) return;

            const name = card.querySelector('.cargo-name')?.value || 'Hàng hóa';
            const width = toCm(card.querySelector('.cargo-width')?.value, currentDimUnit) || 50;
            const length = toCm(card.querySelector('.cargo-length')?.value, currentDimUnit) || 60;
            const height = toCm(card.querySelector('.cargo-height')?.value, currentDimUnit) || 40;
            const qty = parseInt(card.querySelector('.cargo-qty')?.value) || 1;
            const rawWt = parseFloat(card.querySelector('.cargo-weight')?.value);
            const weight = isNaN(rawWt) ? 0 : Math.max(0, rawWt);
            const color = card.querySelector('.color-picker')?.value || '#dc2626';

            const typeRadio = card.querySelector('input[type="radio"]:checked');
            const type = typeRadio ? typeRadio.value : 'box';

            const stackCheckbox = card.querySelector('.cargo-stackable') || card.querySelector('.checkbox-pill input');
            const stackable = stackCheckbox ? stackCheckbox.checked : true;

            const floorCheckbox = card.querySelector('.cargo-floor-only');
            const floorOnly = floorCheckbox ? floorCheckbox.checked : false;

            const posSelect = card.querySelector('.cargo-position');
            const position = posSelect ? posSelect.value : 'normal';

            const rotSelect = card.querySelector('.cargo-rotation');
            let rotation = rotSelect ? rotSelect.value : 'fit';
            if (!rotSelect) {
                const activeRotBtn = card.querySelector('.rot-btn.active');
                rotation = activeRotBtn && activeRotBtn.title.includes('Khóa') ? 'locked' : 'fit';
            }

            items.push({
                name, width, length, height, qty, weight, color, type,
                included, stackable, floorOnly, position, rotation,
                stop: card.dataset.stop || 'Stop 1'
            });
        });

        return items;
    }

    // 6. Intelligent Best Fit Recommendation Algorithm
    function evaluateBestFit(cargoItems, enforcePayload = isPayloadEnforced()) {
        let totalVol = 0;
        let totalWt = 0;
        let maxL = 0, maxW = 0, maxH = 0;

        cargoItems.forEach(item => {
            const l_m = (item.length || 0) / 100;
            const w_m = (item.width || 0) / 100;
            const h_m = (item.height || 0) / 100;
            const q = item.qty || 1;

            totalVol += (l_m * w_m * h_m * q);
            totalWt += (item.weight || 0) * q;

            if (l_m > maxL) maxL = l_m;
            if (w_m > maxW) maxW = w_m;
            if (h_m > maxH) maxH = h_m;
        });

        let recommended = '20dc';
        let isOversized = false;
        let msg = '';
        let numContainers = 1;

        const lang = document.documentElement.lang;

        // Constraint Evaluation
        if (maxL > 5.89 || maxW > 2.35 || totalVol > 28.5 || (enforcePayload && totalWt > 28200) || maxH > 2.38) {
            // Cannot fit in 20DC
            if (totalVol <= 59.0 && (!enforcePayload || totalWt <= 26680) && maxH <= 2.38 && maxL <= 12.03) {
                recommended = '40dc';
                msg = lang === 'vi'
                    ? `Đề xuất tối ưu: <span class="fit-highlight">40' Dry Container (40DC)</span> — Thể tích hàng (${totalVol.toFixed(1)} m³) vượt quá cont 20ft (33.2 m³). Vừa vặn 100% trong cont 40DC!`
                    : `Optimal Recommendation: <span class="fit-highlight">40' Dry Container (40DC)</span> — Cargo volume (${totalVol.toFixed(1)} m³) exceeds 20ft container (33.2 m³). Fits 100% in 40DC!`;
            } else if (totalVol <= 68.5 && (!enforcePayload || totalWt <= 26460) && maxL <= 12.03) {
                recommended = '40hc';
                msg = lang === 'vi'
                    ? `Đề xuất tối ưu: <span class="fit-highlight">40' High Cube (40HC)</span> — Chiều cao kiện hàng (${(maxH*100).toFixed(0)}cm) hoặc thể tích (${totalVol.toFixed(1)} m³) phù hợp nhất với cont 40' cao!`
                    : `Optimal Recommendation: <span class="fit-highlight">40' High Cube (40HC)</span> — Cargo height (${(maxH*100).toFixed(0)}cm) or volume (${totalVol.toFixed(1)} m³) is ideal for 40' High Cube!`;
            } else if (totalVol <= 76.5 && (!enforcePayload || totalWt <= 27800) && maxL <= 13.55) {
                recommended = '45hc';
                msg = lang === 'vi'
                    ? `Đề xuất tối ưu: <span class="fit-highlight">Container 45' High Cube (45HC)</span> — Khối tích lớn (${totalVol.toFixed(1)} m³, dài ${maxL.toFixed(2)}m), vừa vặn 100% trong cont 45ft!`
                    : `Optimal Recommendation: <span class="fit-highlight">45' High Cube Container (45HC)</span> — High cargo volume (${totalVol.toFixed(1)} m³, length ${maxL.toFixed(2)}m), fits 100% in 45HC!`;
            } else {
                // Multi-container requirement
                const wtContainers = enforcePayload ? (totalWt / 26000) : 0;
                numContainers = Math.max(2, Math.ceil(Math.max(totalVol / 65, wtContainers)));
                recommended = '40hc';
                isOversized = true;
                const reasonNote = (enforcePayload && totalWt > 27800 && totalVol <= 76.5)
                    ? (lang === 'vi' ? ' (vượt giới hạn tải trọng)' : ' (exceeds payload limit)')
                    : '';
                msg = lang === 'vi'
                    ? `⚠️ Cảnh báo vượt tải: Lô hàng lớn (${totalVol.toFixed(1)} m³, ${totalWt.toLocaleString()} kg)${reasonNote} vượt quá 1 container! Cần <span class="fit-highlight">${numContainers} container 40HC</span> để xếp hết.`
                    : `⚠️ Over-capacity Alert: Large shipment (${totalVol.toFixed(1)} m³, ${totalWt.toLocaleString()} kg)${reasonNote} exceeds 1 container! Requires <span class="fit-highlight">${numContainers}x 40HC containers</span>.`;
            }
        } else {
            // Perfectly fits in 20DC
            recommended = '20dc';
            const utilEst = ((totalVol / 33.2) * 100).toFixed(1);
            msg = lang === 'vi'
                ? `Đề xuất tối ưu: <span class="fit-highlight">20' Dry Container (20DC)</span> — Vừa vặn 100% trong 1 cont 20ft (Lấp đầy: ~${utilEst}%, ${totalWt.toLocaleString()}/28,200 kg).`
                : `Optimal Recommendation: <span class="fit-highlight">20' Dry Container (20DC)</span> — Fits 100% in 1x 20ft container (Fill: ~${utilEst}%, ${totalWt.toLocaleString()}/28,200 kg).`;
        }

        return { recommended, isOversized, msg, numContainers, totalVol, totalWt };
    }

    function evaluateBestFitAndSync() {
        const cargoItems = getCargoData();
        const bestInfo = evaluateBestFit(cargoItems, isPayloadEnforced());

        // Update Banner UI
        if (bestFitBanner && bestFitMsg) {
            bestFitMsg.innerHTML = bestInfo.msg;
            if (bestInfo.isOversized) {
                bestFitBanner.classList.add('warning');
                if (btnAutoSplitBanner) {
                    btnAutoSplitBanner.style.display = 'inline-block';
                    btnAutoSplitBanner.textContent = document.documentElement.lang === 'vi'
                        ? `⚡ Phân bổ ${bestInfo.numContainers} Cont`
                        : `⚡ Auto Split ${bestInfo.numContainers} Conts`;
                }
            } else {
                bestFitBanner.classList.remove('warning');
                if (btnAutoSplitBanner) btnAutoSplitBanner.style.display = 'none';
            }
        }

        // Highlight recommended button with glowing badge
        eqButtons.forEach(btn => {
            const eq = btn.getAttribute('data-equipment');
            if (eq === bestInfo.recommended) {
                btn.classList.add('recommended');
            } else {
                btn.classList.remove('recommended');
            }
        });

        // If Auto-Fit is enabled, automatically switch container equipment
        if (autoFitToggle && autoFitToggle.checked) {
            if (selectedEquipment !== bestInfo.recommended) {
                selectEquipment(bestInfo.recommended, false);
                return; // selectEquipment will triggerLiveSimulation
            }
        }

        triggerLiveSimulation();
    }

    function triggerLiveSimulation() {
        if (!simulation) return;
        clearTimeout(liveSimTimeout);
        liveSimTimeout = setTimeout(() => {
            const cargoItems = getCargoData();
            const selectedAlgo = document.querySelector('input[name="algorithm"]:checked')?.value || 'best-balance';
            if (!activeContainers || activeContainers.length === 0) {
                activeContainers = [selectedEquipment || '20dc'];
            }
            const result = simulation.packCargo(cargoItems, selectedAlgo, activeContainers, getPackingOptions());
            renderContainerTabs(result);
            renderSmartFleetPills();
            const firstEq = activeContainers[0] || selectedEquipment || '20dc';
            const data = equipmentData[firstEq] || equipmentData['40hc'];
            const hudContainerTitle = document.getElementById('hudContainerTitle');
            if (hudContainerTitle) hudContainerTitle.textContent = `Container 1 (${data.label.split(' ')[0]})`;
            if (simEquipmentLabel) simEquipmentLabel.textContent = activeContainers.length > 1 ? `${data.label} (Cont 1)` : data.label;
            updateUIWithSimulationResult(result.activeContainerStats || result);
        }, 150);
    }

    function renderSmartFleetPills() {
        if (!smartFleetBar || !smartFleetPills) return;
        if (!lastSmartFleetPlans || lastSmartFleetPlans.length === 0) {
            smartFleetBar.style.display = 'none';
            return;
        }
        smartFleetBar.style.display = 'flex';
        const activeKey = activeContainers.join(',');
        smartFleetPills.innerHTML = '';

        lastSmartFleetPlans.forEach(plan => {
            const btn = document.createElement('button');
            btn.type = 'button';
            const planKey = plan.fleet.join(',');
            btn.className = `fleet-plan-pill ${planKey === activeKey ? 'active' : ''}`;
            btn.innerHTML = `
                ${plan.recommended ? '<span class="fleet-rec-star">⭐ Tối ưu</span>' : ''}
                <span>${plan.label}</span>
                <span class="fleet-util-tag">${plan.fleetUtil}%</span>
                <small style="opacity:0.7;">(${plan.fleetCbm} m³)</small>
            `;
            btn.addEventListener('click', () => {
                activeContainers = plan.fleet.slice();
                if (activeContainers.length > 0) {
                    selectedEquipment = activeContainers[0];
                }
                triggerLiveSimulation();
                showToast(`Đã áp dụng tổ hợp ${plan.label} (Lấp đầy tổng ${plan.fleetUtil}%)`);
            });
            smartFleetPills.appendChild(btn);
        });
    }

    function renderContainerTabs(simResult) {
        if (!containerTabsList || !containerTabsBar) return;

        // Container Tabs bar is always visible so user can see container status and click "+ Thêm cont" anytime
        containerTabsBar.style.display = 'flex';

        if (btnAutoSplit) {
            const hasOverflow = (simResult && simResult.totalUnplaced > 0);
            btnAutoSplit.style.display = (hasOverflow || activeContainers.length > 1) ? 'inline-flex' : 'none';
        }

        containerTabsList.innerHTML = '';
        activeContainers.forEach((eqKey, idx) => {
            const data = equipmentData[eqKey] || equipmentData['40hc'];
            const contStats = (simResult && simResult.containers && simResult.containers[idx]) || null;
            const util = contStats ? contStats.utilization : '0.0';
            const isActive = idx === (simulation ? simulation.activeContainerIdx : 0);

            const btn = document.createElement('button');
            btn.className = `cont-tab-btn ${isActive ? 'active' : ''}`;
            btn.dataset.contIndex = idx;
            btn.innerHTML = `
                <span><i class="fas fa-box"></i> Cont ${idx + 1} (${eqKey.toUpperCase()})</span>
                <span class="cont-tab-badge">${util}%</span>
                ${activeContainers.length > 1 ? `<i class="fas fa-times-circle cont-tab-del" data-del-index="${idx}" title="Xóa Container này"></i>` : ''}
            `;

            btn.addEventListener('click', (e) => {
                if (e.target.classList.contains('cont-tab-del')) {
                    e.stopPropagation();
                    const delIdx = parseInt(e.target.getAttribute('data-del-index'));
                    if (activeContainers.length > 1) {
                        activeContainers.splice(delIdx, 1);
                        triggerLiveSimulation();
                    }
                    return;
                }
                if (simulation) {
                    const stats = simulation.showContainer(idx);
                    document.querySelectorAll('.cont-tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    if (simEquipmentLabel) simEquipmentLabel.textContent = `${data.label} (Cont ${idx + 1})`;
                    const hudContainerTitle = document.getElementById('hudContainerTitle');
                    if (hudContainerTitle) hudContainerTitle.textContent = `Container ${idx + 1} (${data.label.split(' ')[0]})`;
                    const resultHeader = document.getElementById('resultContainerHeader');
                    if (resultHeader) resultHeader.textContent = `Container ${idx + 1} (${data.label}) - Kết quả tải trọng & xếp dỡ`;
                    if (stats) updateUIWithSimulationResult(stats);
                }
            });

            containerTabsList.appendChild(btn);
        });
    }

    function handleAutoSplit() {
        const cargoItems = getCargoData();
        if (!cargoItems || cargoItems.length === 0) {
            showToast('Vui lòng chọn ít nhất 1 mã hàng để phân bổ container!', true);
            return;
        }
        const selectedAlgo = document.querySelector('input[name="algorithm"]:checked')?.value || 'best-balance';
        const opts = getPackingOptions();

        if (simulation && typeof simulation.computeOptimalMixedFleet === 'function') {
            const plans = simulation.computeOptimalMixedFleet(cargoItems, selectedAlgo, opts);
            lastSmartFleetPlans = plans;
            if (plans && plans.length > 0) {
                activeContainers = plans[0].fleet.slice();
                selectedEquipment = activeContainers[0];
                showToast(`Đề xuất tối ưu: ${plans[0].label} (Tổng lấp đầy ${plans[0].fleetUtil}%)`);
            } else {
                const eqType = selectedEquipment || '40hc';
                const needed = simulation.computeOptimalContainerCount(cargoItems, selectedAlgo, eqType, opts);
                activeContainers = Array(Math.max(1, needed)).fill(eqType);
            }
        } else {
            const eqType = selectedEquipment || '40hc';
            const needed = Math.max(2, evaluateBestFit(cargoItems, isPayloadEnforced()).numContainers || 2);
            activeContainers = Array(Math.max(1, needed)).fill(eqType);
        }

        triggerLiveSimulation();
        if (containerTabsBar) {
            containerTabsBar.style.display = 'flex';
            containerTabsBar.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    if (btnAutoSplit) btnAutoSplit.addEventListener('click', handleAutoSplit);
    if (btnAutoSplitBanner) btnAutoSplitBanner.addEventListener('click', handleAutoSplit);
    if (btnAddCont) {
        btnAddCont.addEventListener('click', () => {
            activeContainers.push(selectedEquipment || '40hc');
            triggerLiveSimulation();
        });
    }

    function updateUIWithSimulationResult(result) {
        if (!result) return;

        // HUD Elements
        const hudPlaced = document.getElementById('hudPlaced');
        const hudUnplacedRow = document.getElementById('hudUnplacedRow');
        const hudUnplaced = document.getElementById('hudUnplaced');
        const hudVol = document.getElementById('hudVolume');
        const hudWt = document.getElementById('hudWeight');
        const hudUtil = document.getElementById('hudUtil');
        const hudCog = document.getElementById('hudCog');
        const hudStatusBadge = document.getElementById('hudStatusBadge');

        const fleetReq = result.fleetTotalRequested ?? result.totalRequested ?? (result.placed + (result.unplaced || 0));
        const fleetPlaced = result.fleetTotalPlaced ?? result.placed;
        const fleetUnplaced = result.fleetTotalUnplaced ?? (result.unplaced || 0);
        const contCount = result.containerCount || 1;

        if (hudPlaced) {
            hudPlaced.textContent = contCount > 1
                ? `${result.placed} kiện (Tổng: ${fleetPlaced} / ${fleetReq})`
                : `${result.placed} / ${fleetReq}`;
        }
        if (hudVol) hudVol.textContent = `${result.volume} m³ / ${result.containerVolume} m³`;
        if (hudWt) hudWt.textContent = `${result.weight} kg`;
        if (hudUtil) hudUtil.textContent = `${result.utilization}%`;
        if (hudCog) hudCog.textContent = result.cogStatus;

        if (fleetUnplaced > 0) {
            if (hudUnplacedRow) hudUnplacedRow.style.display = 'flex';
            if (hudUnplaced) {
                hudUnplaced.style.color = '#ef4444';
                const unplacedAmt = contCount > 1 ? fleetUnplaced : (result.unplaced || fleetUnplaced);
                hudUnplaced.textContent = result.stopReason === 'payload'
                    ? `${unplacedAmt} kiện (Chạm tải trọng ${result.maxPayload.toLocaleString()} kg)`
                    : `${unplacedAmt} kiện (Hết thể tích Cont)`;
            }
            if (hudStatusBadge) {
                hudStatusBadge.textContent = `Chưa xếp: ${fleetUnplaced} kiện`;
                hudStatusBadge.classList.remove('info');
                hudStatusBadge.classList.add('warning');
            }
        } else if (contCount > 1 && (result.unplaced || 0) > 0) {
            if (hudUnplacedRow) hudUnplacedRow.style.display = 'flex';
            if (hudUnplaced) {
                hudUnplaced.style.color = '#38bdf8';
                hudUnplaced.textContent = result.stopReason === 'payload'
                    ? `${result.unplaced} kiện → sang Cont sau (chạm tải trọng)`
                    : `${result.unplaced} kiện → sang Cont sau`;
            }
            if (hudStatusBadge) {
                hudStatusBadge.textContent = `Đủ 100% (${contCount} Cont)`;
                hudStatusBadge.classList.remove('warning');
                hudStatusBadge.classList.add('info');
            }
        } else {
            if (hudUnplacedRow) hudUnplacedRow.style.display = 'none';
            if (hudStatusBadge) {
                hudStatusBadge.textContent = contCount > 1 ? `Đủ 100% (${contCount} Cont)` : '100% Vừa vặn';
                hudStatusBadge.classList.remove('warning', 'info');
            }
        }

        // Result Table Elements
        const resPlaced = document.getElementById('resultPlaced');
        const resUnplacedRow = document.getElementById('resultUnplacedRow');
        const resUnplaced = document.getElementById('resultUnplaced');
        const resVol = document.getElementById('resultVolume');
        const resCapacity = document.getElementById('resultCapacity');
        const resMass = document.getElementById('resultMass');
        const resPayload = document.getElementById('resultPayload');
        const resUtil = document.getElementById('resultUtil');
        const resCog = document.getElementById('resultCog');
        const simResults = document.getElementById('simResults');

        if (resPlaced) {
            resPlaced.textContent = contCount > 1
                ? `${result.placed} kiện (Tổng: ${fleetPlaced} / ${fleetReq} kiện)`
                : `${result.placed} / ${fleetReq} kiện`;
        }
        if (fleetUnplaced > 0) {
            if (resUnplacedRow) resUnplacedRow.style.display = 'table-row';
            if (resUnplaced) {
                resUnplaced.textContent = result.stopReason === 'payload'
                    ? `${fleetUnplaced} kiện chưa xếp (Chạm giới hạn tải trọng ${result.maxPayload.toLocaleString()} kg)`
                    : `${fleetUnplaced} kiện chưa vừa container!`;
            }
        } else {
            if (resUnplacedRow) resUnplacedRow.style.display = 'none';
        }

        if (resVol) resVol.textContent = `${result.volume} m³`;
        if (resCapacity) resCapacity.textContent = `${result.containerVolume} m³`;
        if (resMass) resMass.textContent = `${result.weight} kg`;
        if (resPayload) resPayload.textContent = `${result.maxPayload.toLocaleString()} kg`;
        if (resUtil) resUtil.textContent = `${result.utilization}% (Thể tích) | ${result.weightUtilization}% (Tải trọng)`;
        if (resCog) resCog.textContent = result.cogStatus;

        if (simResults) simResults.style.display = 'block';
    }

    // 7. Full Plan Execution (Interactive progress animation on button click)
    function run3DLoadPlan() {
        const loadingOverlay = document.getElementById('simLoading');
        const loadingFill = document.getElementById('loadingFill');
        const simSection = document.getElementById('simulation');

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

                        // Evaluate Best Fit and Run
                        evaluateBestFitAndSync();
                    }, 250);
                }
            }, 100);
        } else {
            evaluateBestFitAndSync();
        }
    }

    const planBtn = document.getElementById('planBtn');
    if (planBtn) {
        planBtn.addEventListener('click', run3DLoadPlan);
    }

    const summaryBtn = document.getElementById('summaryBtn');
    // 8. Summary Modal & Printable Loading Manifest
    const summaryModal = document.getElementById('summaryModal');
    const btnCloseSummaryModal = document.getElementById('btnCloseSummaryModal');
    const btnModalPrint = document.getElementById('btnModalPrint');
    const btnModalExport = document.getElementById('btnModalExport');

    function openSummaryManifestModal() {
        if (!summaryModal) return;
        const cargoItems = getCargoData();
        const fleet = (activeContainers && activeContainers.length > 0) ? activeContainers : [selectedEquipment || '20dc'];
        const firstData = equipmentData[fleet[0]] || equipmentData['40hc'];

        // Aggregate actual placed counts per SKU across all containers in simulation
        const placedBySku = new Map();
        let totalFleetPlaced = 0;
        let fleetCapacityVol = 0;
        let fleetMaxPayload = 0;
        let cogSummaryText = 'Cân đối (Tâm cont)';

        fleet.forEach(eqKey => {
            const d = equipmentData[eqKey] || equipmentData['40hc'];
            fleetCapacityVol += (d.maxVol || 76.3);
            const numPayload = parseInt(String(d.payload || '26460').replace(/[^\d]/g, '')) || 26460;
            fleetMaxPayload += numPayload;
        });

        if (simulation && Array.isArray(simulation.multiContainerData) && simulation.multiContainerData.length > 0) {
            simulation.multiContainerData.forEach(c => {
                (c.boxMeshesData || []).forEach(b => {
                    placedBySku.set(b.name, (placedBySku.get(b.name) || 0) + 1);
                    totalFleetPlaced++;
                });
            });
            const activeCont = simulation.multiContainerData[simulation.activeContainerIdx || 0];
            if (activeCont && activeCont.stats && activeCont.stats.cogStatus) {
                cogSummaryText = activeCont.stats.cogStatus;
            }
        }

        // Format fleet label (e.g., "1×40HC + 1×40DC (2 Cont)" or single container label)
        let equipLabel = firstData.label;
        if (fleet.length > 1) {
            const counts = {};
            fleet.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
            const summaryStr = Object.entries(counts).map(([k, v]) => `${v}×${k.toUpperCase()}`).join(' + ');
            equipLabel = `${summaryStr} (${fleet.length} Container)`;
        }

        let totalVol = 0;
        let totalWt = 0;
        let totalQty = 0;

        const tableBody = document.getElementById('modalManifestTableBody');
        if (tableBody) tableBody.innerHTML = '';

        const fmtDim = (n) => parseFloat((parseFloat(n) || 0).toFixed(2));
        const usedBySku = new Map();

        cargoItems.forEach((item, idx) => {
            const w = item.width || 50;
            const l = item.length || 60;
            const h = item.height || 40;
            const q = item.qty || 1;
            const rawWt = parseFloat(item.weight);
            const wt = isNaN(rawWt) ? 0 : Math.max(0, rawWt);
            const itemVol = (w * l * h * q) / 1000000;
            const itemWt = wt * q;

            totalVol += itemVol;
            totalWt += itemWt;
            totalQty += q;

            // Allocate placed boxes across duplicate SKU names if any
            const totalSkuPlaced = placedBySku.get(item.name) || 0;
            const alreadyAllocated = usedBySku.get(item.name) || 0;
            const rowPlaced = totalFleetPlaced > 0
                ? Math.min(q, Math.max(0, totalSkuPlaced - alreadyAllocated))
                : q;
            usedBySku.set(item.name, alreadyAllocated + rowPlaced);

            if (tableBody) {
                const tr = document.createElement('tr');
                const statusColor = rowPlaced < q ? 'color:#ef4444;font-weight:700;' : 'color:#10b981;font-weight:700;';
                tr.innerHTML = `
                    <td>${idx + 1}</td>
                    <td><strong>${item.name}</strong></td>
                    <td>${fmtDim(l)} × ${fmtDim(w)} × ${fmtDim(h)}</td>
                    <td style="${statusColor}">${rowPlaced.toLocaleString()} / ${q.toLocaleString()}</td>
                    <td>${wt}</td>
                    <td>${itemWt.toLocaleString('en-US', { maximumFractionDigits: 1 })}</td>
                    <td>${itemVol.toFixed(3)}</td>
                    <td>${item.stop || 'Stop 1'}</td>
                `;
                tableBody.appendChild(tr);
            }
        });

        const totalCft = (totalVol * 35.3147).toFixed(1);
        const freightTon = Math.max(totalVol, totalWt / 1000).toFixed(2);
        const airVolWeight = Math.round((totalVol * 1000000) / 6000);
        const utilPercent = fleetCapacityVol > 0 ? ((totalVol / fleetCapacityVol) * 100).toFixed(1) : '0.0';

        const modalJobId = document.getElementById('modalJobId');
        const modalEquip = document.getElementById('modalEquipmentName');
        const modalCreated = document.getElementById('modalCreatedDate');
        const modalCbm = document.getElementById('modalTotalCbm');
        const modalCft = document.getElementById('modalTotalCft');
        const modalGross = document.getElementById('modalTotalWeight');
        const modalMaxPayload = document.getElementById('modalMaxPayload');
        const modalFt = document.getElementById('modalFreightTon');
        const modalAir = document.getElementById('modalAirVolWeight');
        const modalUtil = document.getElementById('modalUtilPercent');
        const modalCogEval = document.getElementById('modalCogEval');

        const dateTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        if (modalJobId) modalJobId.textContent = `TNG-STOW-${dateTag}`;
        if (modalEquip) modalEquip.textContent = equipLabel;
        if (modalCreated) modalCreated.textContent = new Date().toLocaleDateString('vi-VN');
        if (modalCbm) modalCbm.textContent = `${totalVol.toFixed(3)} m³`;
        if (modalCft) modalCft.textContent = `${totalCft} CFT`;
        if (modalGross) modalGross.textContent = `${totalWt.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`;
        if (modalMaxPayload) modalMaxPayload.textContent = `Max: ${fleetMaxPayload.toLocaleString()} kg (${fleet.length} cont)`;
        if (modalFt) modalFt.textContent = `${freightTon} FT`;
        if (modalAir) modalAir.textContent = `${airVolWeight.toLocaleString()} kg`;
        if (modalUtil) modalUtil.textContent = `${utilPercent}%`;
        if (modalCogEval) modalCogEval.textContent = `Trọng tâm: ${cogSummaryText}`;

        summaryModal.style.display = 'flex';
    }

    if (summaryBtn) {
        summaryBtn.addEventListener('click', openSummaryManifestModal);
    }

    if (btnCloseSummaryModal) {
        btnCloseSummaryModal.addEventListener('click', () => {
            summaryModal.style.display = 'none';
        });
    }

    if (btnModalPrint) {
        btnModalPrint.addEventListener('click', () => {
            if (summaryModal) summaryModal.style.display = 'none';
            openLoadingPlanPdfModal();
        });
    }

    // ===== 8B. Paste Directly from Excel / Google Sheets Modal (Phase 2 — Item 5) =====
    const pasteExcelModal = document.getElementById('pasteExcelModal');
    const btnOpenPasteExcel = document.getElementById('btnOpenPasteExcel');
    const btnPasteExcelInline = document.getElementById('btnPasteExcelInline');
    const btnClosePasteModal = document.getElementById('btnClosePasteModal');
    const btnCancelPasteModal = document.getElementById('btnCancelPasteModal');
    const btnConfirmPasteExcel = document.getElementById('btnConfirmPasteExcel');
    const btnPasteSampleInch = document.getElementById('btnPasteSampleInch');
    const pasteExcelInput = document.getElementById('pasteExcelInput');
    const pasteUnitSwitcher = document.getElementById('pasteUnitSwitcher');
    const pasteImportMode = document.getElementById('pasteImportMode');
    const pastePreviewSummary = document.getElementById('pastePreviewSummary');
    const pastePreviewTableBody = document.getElementById('pastePreviewTableBody');

    let pasteSourceUnit = 'cm';
    let parsedPasteRows = [];

    function parseNumberCell(str) {
        if (str === undefined || str === null) return NaN;
        const cleaned = String(str).trim().replace(/,/g, '');
        if (!cleaned) return NaN;
        return parseFloat(cleaned);
    }

    function parsePastedExcelText(rawText, unit = 'cm') {
        const lines = String(rawText || '')
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l.length > 0);
        if (lines.length === 0) return [];

        const splitLine = (line) => {
            if (line.includes('\t')) return line.split('\t').map(s => s.trim());
            if (line.includes(';')) return line.split(';').map(s => s.trim());
            return line.split(',').map(s => s.trim());
        };

        const firstCols = splitLine(lines[0]);
        const headerJoined = firstCols.join(' ').toLowerCase();
        const isHeaderRow = /(tên|name|sku|mã|item|dài|length|rộng|width|cao|height|số lượng|qty)/.test(headerJoined)
            && isNaN(parseNumberCell(firstCols[1])) && isNaN(parseNumberCell(firstCols[2]));

        let colMap = null;
        let startIdx = 0;
        if (isHeaderRow) {
            startIdx = 1;
            colMap = { name: -1, l: -1, w: -1, h: -1, qty: -1, weight: -1, color: -1, stop: -1 };
            firstCols.forEach((h, i) => {
                const k = h.toLowerCase();
                if (colMap.name === -1 && /(tên|name|sku|mã|item|product|style)/.test(k)) colMap.name = i;
                else if (colMap.l === -1 && /(dài|length|\bl\b)/.test(k)) colMap.l = i;
                else if (colMap.w === -1 && /(rộng|width|\bw\b)/.test(k)) colMap.w = i;
                else if (colMap.h === -1 && /(cao|height|\bh\b)/.test(k)) colMap.h = i;
                else if (colMap.qty === -1 && /(số lượng|qty|quantity|\bsl\b|pcs|ctn|carton)/.test(k)) colMap.qty = i;
                else if (colMap.weight === -1 && /(đơn trọng|weight|trọng lượng|khối lượng|\bwt\b|kg)/.test(k) && !/tổng|total/.test(k)) colMap.weight = i;
                else if (colMap.color === -1 && /(màu|color|hex)/.test(k)) colMap.color = i;
                else if (colMap.stop === -1 && /(stop|điểm dỡ)/.test(k)) colMap.stop = i;
            });
        }

        const results = [];
        for (let idx = startIdx; idx < lines.length; idx++) {
            const cols = splitLine(lines[idx]);
            if (cols.length < 4) continue;

            let name, rawL, rawW, rawH, qty, weight = 0, color = '', stop = 'Stop 1';

            if (colMap && colMap.l >= 0 && colMap.w >= 0 && colMap.h >= 0) {
                name = (colMap.name >= 0 && cols[colMap.name]) ? cols[colMap.name] : `Kiện hàng ${results.length + 1}`;
                rawL = parseNumberCell(cols[colMap.l]);
                rawW = parseNumberCell(cols[colMap.w]);
                rawH = parseNumberCell(cols[colMap.h]);
                qty = colMap.qty >= 0 ? Math.round(parseNumberCell(cols[colMap.qty])) : 1;
                if (colMap.weight >= 0) {
                    const pw = parseNumberCell(cols[colMap.weight]);
                    weight = isNaN(pw) ? 0 : Math.max(0, pw);
                }
                if (colMap.color >= 0) color = cols[colMap.color] || '';
                if (colMap.stop >= 0 && cols[colMap.stop]) stop = cols[colMap.stop];
            } else {
                // Headerless auto-detection: check if col 0 is leading STT index (1, 2, 3...) followed by text name
                let offset = 0;
                if (cols.length >= 6 && /^\d+$/.test(cols[0]) && isNaN(parseNumberCell(cols[1]))) {
                    offset = 1;
                } else if (cols.length >= 6 && /^\d+$/.test(cols[0]) && cols[1].length >= 4 && !isNaN(parseNumberCell(cols[2])) && !isNaN(parseNumberCell(cols[3])) && !isNaN(parseNumberCell(cols[4]))) {
                    // e.g. "1 | 0755946 | 35.56 | 33.02 | 21.59 | 175"
                    const c0Num = parseInt(cols[0]);
                    if (c0Num >= 1 && c0Num <= 500 && String(cols[0]).length <= 3) offset = 1;
                }
                name = cols[offset] || `Kiện hàng ${results.length + 1}`;
                rawL = parseNumberCell(cols[offset + 1]);
                rawW = parseNumberCell(cols[offset + 2]);
                rawH = parseNumberCell(cols[offset + 3]);
                qty = Math.round(parseNumberCell(cols[offset + 4]));
                const pw = parseNumberCell(cols[offset + 5]);
                weight = isNaN(pw) ? 0 : Math.max(0, pw);
            }

            if (isNaN(rawL) || isNaN(rawW) || isNaN(rawH) || rawL <= 0 || rawW <= 0 || rawH <= 0) continue;
            if (isNaN(qty) || qty <= 0) qty = 1;

            const lCm = parseFloat((rawL * (UNIT_TO_CM[unit] || 1)).toFixed(3));
            const wCm = parseFloat((rawW * (UNIT_TO_CM[unit] || 1)).toFixed(3));
            const hCm = parseFloat((rawH * (UNIT_TO_CM[unit] || 1)).toFixed(3));
            const cbm = (lCm * wCm * hCm * qty) / 1000000;

            results.push({ name, rawL, rawW, rawH, lCm, wCm, hCm, qty, weight, color, stop, cbm });
        }
        return results;
    }

    function updatePastePreview() {
        if (!pasteExcelInput || !pastePreviewTableBody || !pastePreviewSummary) return;
        parsedPasteRows = parsePastedExcelText(pasteExcelInput.value, pasteSourceUnit);
        const uLabel = UNIT_SHORT[pasteSourceUnit] || 'cm';

        if (parsedPasteRows.length === 0) {
            pastePreviewSummary.textContent = 'Chưa nhận diện được dòng dữ liệu hợp lệ';
            pastePreviewTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#64748b;padding:16px;">Dán dữ liệu từ Excel (cột: Tên, Dài, Rộng, Cao, SL, Đơn trọng) để xem trước</td></tr>';
            if (btnConfirmPasteExcel) btnConfirmPasteExcel.disabled = true;
            return;
        }

        const totQty = parsedPasteRows.reduce((s, r) => s + r.qty, 0);
        const totCbm = parsedPasteRows.reduce((s, r) => s + r.cbm, 0);
        pastePreviewSummary.textContent = `${parsedPasteRows.length} mã hàng • ${totQty.toLocaleString()} kiện • ${totCbm.toFixed(3)} m³`;
        if (btnConfirmPasteExcel) btnConfirmPasteExcel.disabled = false;

        pastePreviewTableBody.innerHTML = parsedPasteRows.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${r.name}</strong></td>
                <td>${r.rawL} × ${r.rawW} × ${r.rawH} ${uLabel}</td>
                <td>${parseFloat(r.lCm.toFixed(2))} × ${parseFloat(r.wCm.toFixed(2))} × ${parseFloat(r.hCm.toFixed(2))} cm</td>
                <td><strong>${r.qty}</strong></td>
                <td>${r.weight} kg</td>
                <td>${r.cbm.toFixed(3)}</td>
            </tr>
        `).join('');
    }

    function openPasteExcelModal() {
        if (!pasteExcelModal) return;
        pasteSourceUnit = currentDimUnit;
        if (pasteUnitSwitcher) {
            pasteUnitSwitcher.querySelectorAll('.unit-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-paste-unit') === pasteSourceUnit);
            });
        }
        pasteExcelModal.style.display = 'flex';
        if (pasteExcelInput) {
            pasteExcelInput.focus();
            updatePastePreview();
        }
    }

    function applyCargoItemsToCards(rowsCm, mode = 'replace') {
        if (!rowsCm || rowsCm.length === 0) return;
        let existingCards = cargoCardsContainer.querySelectorAll('.cargo-card');
        let startCardOffset = 0;

        if (mode === 'replace') {
            for (let i = 1; i < existingCards.length; i++) {
                existingCards[i].remove();
            }
            startCardOffset = 0;
        } else {
            startCardOffset = existingCards.length;
        }

        rowsCm.forEach((r, idx) => {
            let card;
            if (mode === 'replace' && idx === 0) {
                card = cargoCardsContainer.querySelector('.cargo-card');
            } else {
                const firstCard = cargoCardsContainer.querySelector('.cargo-card');
                duplicateCargoCard(firstCard, true);
                const allCards = cargoCardsContainer.querySelectorAll('.cargo-card');
                card = allCards[allCards.length - 1];
            }

            const colorIdx = startCardOffset + idx;
            const hexColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(r.color || '').trim())
                ? String(r.color).trim()
                : defaultColors[colorIdx % defaultColors.length];

            if (card) {
                card.querySelector('.cargo-name').value = r.name;
                card.querySelector('.cargo-length').value = fromCm(r.lCm, currentDimUnit);
                card.querySelector('.cargo-width').value = fromCm(r.wCm, currentDimUnit);
                card.querySelector('.cargo-height').value = fromCm(r.hCm, currentDimUnit);
                card.querySelector('.cargo-qty').value = r.qty;
                card.querySelector('.cargo-weight').value = r.weight || 0;
                card.dataset.stop = r.stop || 'Stop 1';

                const incCb = card.querySelector('.cargo-include');
                if (incCb) incCb.checked = true;
                card.classList.remove('cargo-excluded');

                const colPicker = card.querySelector('.color-picker');
                if (colPicker) colPicker.value = hexColor;

                const stackCb = card.querySelector('.cargo-stackable') || card.querySelector('.checkbox-pill input');
                const stackPill = card.querySelector('.stack-pill') || card.querySelector('.checkbox-pill');
                const stackVal = r.stackable !== false;
                if (stackCb) stackCb.checked = stackVal;
                if (stackPill) stackPill.classList.toggle('active', stackVal);

                const floorCb = card.querySelector('.cargo-floor-only');
                const floorPill = card.querySelector('.floor-pill');
                const floorVal = r.floorOnly === true;
                if (floorCb) floorCb.checked = floorVal;
                if (floorPill) floorPill.classList.toggle('active', floorVal);

                const posSel = card.querySelector('.cargo-position');
                if (posSel) posSel.value = r.position || 'normal';

                const targetType = r.type || 'box';
                card.querySelectorAll('.radio-pill').forEach(p => {
                    const inp = p.querySelector('input');
                    const matched = inp && inp.value === targetType;
                    if (inp) inp.checked = !!matched;
                    p.classList.toggle('active', !!matched);
                });
                if (targetType === 'fabric') {
                    const u = UNIT_SHORT[currentDimUnit] || 'cm';
                    const wLbl = card.querySelector('.cargo-width')?.closest('.dim-input')?.querySelector('label');
                    const lLbl = card.querySelector('.cargo-length')?.closest('.dim-input')?.querySelector('label');
                    const hLbl = card.querySelector('.cargo-height')?.closest('.dim-input')?.querySelector('label');
                    if (lLbl) lLbl.textContent = `Khổ vải L (${u})`;
                    if (wLbl) wLbl.textContent = `Đường kính Ø (${u})`;
                    if (hLbl) hLbl.textContent = `Đường kính (${u})`;
                }

                const cWtSpan = card.querySelector('[id^="totalWeight"]');
                const cVolSpan = card.querySelector('[id^="totalVol"]');
                if (cWtSpan) cWtSpan.textContent = ((r.weight || 0) * r.qty).toLocaleString('en-US', { maximumFractionDigits: 1 });
                const cardVol = (targetType === 'fabric')
                    ? (Math.PI * Math.pow(Math.max(r.wCm, r.hCm) / 2, 2) * r.lCm * r.qty) / 1000000
                    : (r.wCm * r.lCm * r.hCm * r.qty) / 1000000;
                if (cVolSpan) cVolSpan.textContent = cardVol.toFixed(3);
            }
        });

        lastSmartFleetPlans = [];
        activeContainers = [selectedEquipment || '40hc'];
        updateDimUnitLabels();
        updateOverallSummary();
        syncCardsToTable();
        evaluateBestFitAndSync();
    }

    if (btnOpenPasteExcel) btnOpenPasteExcel.addEventListener('click', openPasteExcelModal);
    if (btnPasteExcelInline) btnPasteExcelInline.addEventListener('click', openPasteExcelModal);
    if (btnClosePasteModal) btnClosePasteModal.addEventListener('click', () => { pasteExcelModal.style.display = 'none'; });
    if (btnCancelPasteModal) btnCancelPasteModal.addEventListener('click', () => { pasteExcelModal.style.display = 'none'; });
    if (pasteExcelInput) pasteExcelInput.addEventListener('input', updatePastePreview);

    if (pasteUnitSwitcher) {
        pasteUnitSwitcher.querySelectorAll('.unit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                pasteSourceUnit = btn.getAttribute('data-paste-unit') || 'cm';
                pasteUnitSwitcher.querySelectorAll('.unit-btn').forEach(b => b.classList.toggle('active', b === btn));
                updatePastePreview();
            });
        });
    }

    if (btnPasteSampleInch) {
        btnPasteSampleInch.addEventListener('click', () => {
            pasteSourceUnit = 'in';
            if (pasteUnitSwitcher) {
                pasteUnitSwitcher.querySelectorAll('.unit-btn').forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-paste-unit') === 'in');
                });
            }
            if (pasteExcelInput) {
                pasteExcelInput.value = [
                    'Mã hàng\tDài (in)\tRộng (in)\tCao (in)\tSL\tĐơn trọng (kg)',
                    'TNG-US-01\t14\t13\t8.5\t420\t12',
                    'TNG-US-02\t16\t14\t8.5\t680\t10',
                    'TNG-US-03\t16\t14\t9.25\t500\t11',
                    'TNG-US-04\t27.5\t13\t6.5\t180\t9'
                ].join('\n');
                updatePastePreview();
            }
        });
    }

    if (btnConfirmPasteExcel) {
        btnConfirmPasteExcel.addEventListener('click', () => {
            if (!parsedPasteRows || parsedPasteRows.length === 0) return;
            const mode = pasteImportMode ? pasteImportMode.value : 'replace';
            applyCargoItemsToCards(parsedPasteRows, mode);
            if (pasteExcelModal) pasteExcelModal.style.display = 'none';
            showToast(`Đã nạp ${parsedPasteRows.length} mã hàng từ bảng dán Excel (đơn vị nguồn: ${UNIT_SHORT[pasteSourceUnit]})!`);
        });
    }

    // ===== 8C. Warehouse 3D Loading Plan PDF Export Modal (Phase 2 — Item 6) =====
    const loadingPlanModal = document.getElementById('loadingPlanModal');
    const loadingPlanPrintSheet = document.getElementById('loadingPlanPrintSheet');
    const btnExportLoadingPlanPdf = document.getElementById('btnExportLoadingPlanPdf');
    const btnExportLoadingPlanPdfTop = document.getElementById('btnExportLoadingPlanPdfTop');
    const btnCloseLoadingPlanModal = document.getElementById('btnCloseLoadingPlanModal');
    const btnPrintLoadingPlan = document.getElementById('btnPrintLoadingPlan');
    const planJobRefInput = document.getElementById('planJobRefInput');
    const planCustomerInput = document.getElementById('planCustomerInput');
    const planLayoutModeSwitcher = document.getElementById('planLayoutModeSwitcher');

    let cachedReportContainers = [];
    let currentPlanLayoutMode = 'detailed';

    function renderLoadingPlanSheet() {
        if (!loadingPlanPrintSheet || !cachedReportContainers || cachedReportContainers.length === 0) return;
        const jobRef = (planJobRefInput?.value || 'TNG-LP-2026').trim();
        const customer = (planCustomerInput?.value || 'Khách hàng TNG Export').trim();
        const todayStr = new Date().toLocaleDateString('vi-VN');
        const totalConts = cachedReportContainers.length;
        const fleetSummary = (() => {
            const counts = {};
            cachedReportContainers.forEach(c => { counts[c.type] = (counts[c.type] || 0) + 1; });
            return Object.entries(counts).map(([k, v]) => `${v}×${k.toUpperCase()}`).join(' + ');
        })();
        const fleetTotalBoxes = cachedReportContainers.reduce((s, c) => s + (c.stats?.placed || 0), 0);
        const fleetTotalCbm = cachedReportContainers.reduce((s, c) => s + (parseFloat(c.stats?.volume) || 0), 0);
        const isCompact = (currentPlanLayoutMode === 'compact');

        loadingPlanPrintSheet.innerHTML = cachedReportContainers.map((c, idx) => {
            const st = c.stats || {};
            const margins = st.margins || { l: 0, w: 0, h: 0 };
            const marginNote = (margins.l || margins.w || margins.h)
                ? `Trừ phồng thùng: L-${margins.l}% / W-${margins.w}% / H-${margins.h}%`
                : 'Kích thước chuẩn 100%';
            const doorNote = st.enforceDoorClearance
                ? `Lọt cửa ISO (${st.doorDims?.w || '2.34'}×${st.doorDims?.h || '2.59'}m)`
                : 'Không giới hạn cửa';

            const viewsHtml = isCompact
                ? `
                    <div class="plan-views-grid compact-grid">
                        <div class="plan-view-card">
                            <div class="plan-view-label">GÓC PHỐI CẢNH 3D (ISOMETRIC)</div>
                            <img src="${c.snapshots.isometric}" alt="Phối cảnh 3D Cont ${idx + 1}">
                        </div>
                        <div class="plan-view-card">
                            <div class="plan-view-label">GÓC NHÌN TỪ TRÊN (SƠ ĐỒ LÀN XẾP)</div>
                            <img src="${c.snapshots.top}" alt="Nhìn từ trên Cont ${idx + 1}">
                        </div>
                    </div>
                `
                : `
                    <div class="plan-views-grid">
                        <div class="plan-view-card">
                            <div class="plan-view-label">1. PHỐI CẢNH 3D (ISOMETRIC)</div>
                            <img src="${c.snapshots.isometric}" alt="Phối cảnh 3D Cont ${idx + 1}">
                        </div>
                        <div class="plan-view-card">
                            <div class="plan-view-label">2. NHÌN TỪ TRÊN (SƠ ĐỒ LÀN)</div>
                            <img src="${c.snapshots.top}" alt="Nhìn từ trên Cont ${idx + 1}">
                        </div>
                        <div class="plan-view-card">
                            <div class="plan-view-label">3. NHÌN TỪ BÊN HÔNG (SỐ TẦNG)</div>
                            <img src="${c.snapshots.side}" alt="Nhìn từ bên Cont ${idx + 1}">
                        </div>
                    </div>
                `;

            const skuRowsHtml = (c.skuManifest || []).map((sku, sIdx) => {
                const lIn = (sku.dimLcm / 2.54).toFixed(1);
                const wIn = (sku.dimWcm / 2.54).toFixed(1);
                const hIn = (sku.dimHcm / 2.54).toFixed(1);
                return `
                    <tr>
                        <td style="text-align:center;font-weight:700;">${sIdx + 1}</td>
                        <td><span class="plan-color-dot" style="background:${sku.color};"></span><strong>${sku.name}</strong></td>
                        <td>${sku.dimLcm}×${sku.dimWcm}×${sku.dimHcm} cm <small style="color:#64748b;">(${lIn}×${wIn}×${hIn}")</small></td>
                        <td style="text-align:right;font-weight:700;">${sku.qty.toLocaleString()}</td>
                        <td>${sku.minX.toFixed(2)}m → ${sku.maxX.toFixed(2)}m</td>
                        <td><strong>${sku.lanes} làn × ${sku.layers} tầng</strong></td>
                        <td>${sku.oriLabel}</td>
                        <td style="text-align:right;">${sku.cbmTotal.toFixed(3)}</td>
                    </tr>
                `;
            }).join('');

            return `
                <div class="plan-container-page">
                    <div class="plan-page-header">
                        <div>
                            <div class="plan-brand-title">TNG LOGISTICS • PHIẾU SƠ ĐỒ ĐÓNG HÀNG CONTAINER (LOADING PLAN)</div>
                            <div class="plan-brand-sub">Lô hàng: <strong>${jobRef}</strong> &nbsp;|&nbsp; Khách hàng/PO: <strong>${customer}</strong> &nbsp;|&nbsp; Ngày lập: <strong>${todayStr}</strong></div>
                            <div class="plan-brand-sub">Tổng đội cont: <strong>${fleetSummary}</strong> (${fleetTotalBoxes.toLocaleString()} kiện • ${fleetTotalCbm.toFixed(3)} m³) &nbsp;|&nbsp; ${marginNote} &nbsp;|&nbsp; ${doorNote}</div>
                        </div>
                        <div class="plan-cont-badge-box">
                            <span class="plan-cont-pill">CONTAINER ${idx + 1} / ${totalConts} — ${c.type.toUpperCase()}</span>
                            <div class="plan-meta-sub">${c.name}</div>
                        </div>
                    </div>

                    <div class="plan-kpi-strip">
                        <div class="plan-kpi-card"><span>Số kiện trong Cont</span><strong>${(st.placed || 0).toLocaleString()} kiện</strong></div>
                        <div class="plan-kpi-card"><span>Thể tích xếp</span><strong>${st.volume || '0.000'} / ${st.containerVolume || '0'} m³</strong></div>
                        <div class="plan-kpi-card"><span>Tỉ lệ lấp đầy</span><strong style="color:#0d9488;">${st.utilization || '0'}%</strong></div>
                        <div class="plan-kpi-card"><span>Tổng trọng lượng</span><strong>${st.weight || '0'} kg</strong></div>
                        <div class="plan-kpi-card"><span>Chiều dài chiếm chỗ</span><strong>${st.maxX || '0'} m</strong></div>
                        <div class="plan-kpi-card"><span>Trọng tâm (CoG)</span><strong>${st.cogStatus || 'Cân đối'}</strong></div>
                    </div>

                    ${viewsHtml}

                    <div class="plan-section-heading">
                        <span>HƯỚNG DẪN XẾP HÀNG THEO THỨ TỰ (TỪ VÁCH TRONG 0.00m → RA CỬA CONT)</span>
                        <span style="font-weight:600;color:#475569;">${(c.skuManifest || []).length} mã hàng trong Cont ${idx + 1}</span>
                    </div>

                    <table class="plan-sku-table">
                        <thead>
                            <tr>
                                <th style="width:34px;text-align:center;">STT</th>
                                <th>Mã hàng (Màu trên 3D)</th>
                                <th>Kích thước thùng</th>
                                <th style="text-align:right;">SL (kiện)</th>
                                <th>Vị trí X (m)</th>
                                <th>Bố trí kho</th>
                                <th>Cách xoay</th>
                                <th style="text-align:right;">CBM (m³)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${skuRowsHtml || '<tr><td colspan="8" style="text-align:center;color:#64748b;">Container trống</td></tr>'}
                        </tbody>
                    </table>

                    <div class="plan-sign-row">
                        <div class="plan-sign-box">
                            <strong>Tổ trưởng Bốc xếp / Kho</strong>
                            <small>(Ký xác nhận đúng sơ đồ)</small>
                        </div>
                        <div class="plan-sign-box">
                            <strong>QC / Giám sát Đóng cont</strong>
                            <small>(Kiểm tra niêm phong & số kiện)</small>
                        </div>
                        <div class="plan-sign-box">
                            <strong>Chuyên viên TNG Logistics</strong>
                            <small>hieutrung@tng.vn</small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    function openLoadingPlanPdfModal() {
        if (!simulation || !loadingPlanModal) return;
        if (!simulation.multiContainerData || simulation.multiContainerData.length === 0) {
            showToast('Chưa có dữ liệu mô phỏng 3D để xuất phiếu!', true);
            return;
        }
        const todayTag = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        if (planJobRefInput && (!planJobRefInput.value || planJobRefInput.value === 'TNG-LP-2026')) {
            planJobRefInput.value = `TNG-LP-${todayTag}`;
        }
        cachedReportContainers = simulation.captureAllContainersReportData();
        renderLoadingPlanSheet();
        loadingPlanModal.style.display = 'flex';
    }

    if (btnExportLoadingPlanPdf) btnExportLoadingPlanPdf.addEventListener('click', openLoadingPlanPdfModal);
    if (btnExportLoadingPlanPdfTop) btnExportLoadingPlanPdfTop.addEventListener('click', openLoadingPlanPdfModal);
    if (btnCloseLoadingPlanModal) btnCloseLoadingPlanModal.addEventListener('click', () => { loadingPlanModal.style.display = 'none'; });
    if (planJobRefInput) planJobRefInput.addEventListener('input', renderLoadingPlanSheet);
    if (planCustomerInput) planCustomerInput.addEventListener('input', renderLoadingPlanSheet);

    if (planLayoutModeSwitcher) {
        planLayoutModeSwitcher.querySelectorAll('.unit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                currentPlanLayoutMode = btn.getAttribute('data-plan-mode') || 'detailed';
                planLayoutModeSwitcher.querySelectorAll('.unit-btn').forEach(b => b.classList.toggle('active', b === btn));
                renderLoadingPlanSheet();
            });
        });
    }

    if (btnPrintLoadingPlan) {
        btnPrintLoadingPlan.addEventListener('click', () => {
            document.body.classList.add('printing-loading-plan');
            const cleanup = () => {
                document.body.classList.remove('printing-loading-plan');
                window.removeEventListener('afterprint', cleanup);
            };
            window.addEventListener('afterprint', cleanup);
            setTimeout(() => {
                window.print();
                setTimeout(cleanup, 1000);
            }, 60);
        });
    }

    // ===== 8D. Supplier Loading Audit (Import Fabric Rolls & Verification) =====
    const btnLoadFabricSample = document.getElementById('btnLoadFabricSample');
    const btnImportSupplierPl = document.getElementById('btnImportSupplierPl');
    const supplierPlFileInput = document.getElementById('supplierPlFileInput');
    const btnPasteSupplierPl = document.getElementById('btnPasteSupplierPl');
    const auditPlPasteBox = document.getElementById('auditPlPasteBox');
    const auditPlPasteInput = document.getElementById('auditPlPasteInput');
    const btnCloseAuditPlPaste = document.getElementById('btnCloseAuditPlPaste');
    const btnParseAuditPlPaste = document.getElementById('btnParseAuditPlPaste');
    const auditPlFilterBar = document.getElementById('auditPlFilterBar');
    const auditPlSummaryInfo = document.getElementById('auditPlSummaryInfo');
    const auditPlContainerFilter = document.getElementById('auditPlContainerFilter');
    const auditDiamEstMode = document.getElementById('auditDiamEstMode');
    const auditDensityWrap = document.getElementById('auditDensityWrap');
    const auditDensityPreset = document.getElementById('auditDensityPreset');
    const auditDensityCustom = document.getElementById('auditDensityCustom');
    const btnRecalcAuditDiam = document.getElementById('btnRecalcAuditDiam');

    const btnRunSupplierAudit = document.getElementById('btnRunSupplierAudit');
    const btnExportAuditPdf = document.getElementById('btnExportAuditPdf');
    const btnUploadSupplierPhoto = document.getElementById('btnUploadSupplierPhoto');
    const supplierPhotoInput = document.getElementById('supplierPhotoInput');
    const supplierPhotoPreview = document.getElementById('supplierPhotoPreview');
    const supplierPhotoWrap = document.getElementById('supplierPhotoWrap');
    const audit3dDoorPreview = document.getElementById('audit3dDoorPreview');
    const audit3dDoorPlaceholder = document.getElementById('audit3dDoorPlaceholder');
    const auditVerdictBox = document.getElementById('auditVerdictBox');
    const auditVerdictPill = document.getElementById('auditVerdictPill');
    const auditVerdictMsg = document.getElementById('auditVerdictMsg');
    const auditFabricSkuBody = document.getElementById('auditFabricSkuBody');
    const btnAddAuditFabricRow = document.getElementById('btnAddAuditFabricRow');
    const auditRadiusSwitcher = document.getElementById('auditRadiusSwitcher');
    const auditRadColHeader = document.getElementById('auditRadColHeader');
    const auditSkuTotBadge = document.getElementById('auditSkuTotBadge');

    let lastAuditReport = null;
    let uploadedSupplierPhotoUrl = '';
    let auditRadMode = 'diameter'; // 'diameter' | 'radius'
    let importedPlData = null; // { sourceName, containers: Map<contNo, rows[]>, allOceanRows: rows[], allRows: rows[] }

    function getAuditDensityKgM3() {
        const val = parseFloat(auditDensityCustom?.value);
        return (val && val > 0) ? val : 250;
    }

    function computeEstimatedDiamCm(lenCm, cbmPerRoll, wtKg, mode) {
        if (mode === 'box-cbm' && cbmPerRoll > 0 && lenCm > 0) {
            return Math.sqrt((cbmPerRoll * 1e6) / lenCm);
        }
        if (mode === 'cyl-cbm' && cbmPerRoll > 0 && lenCm > 0) {
            return Math.sqrt((4 * cbmPerRoll * 1e6) / (Math.PI * lenCm));
        }
        if (mode === 'weight' && wtKg > 0 && lenCm > 0) {
            const rho = getAuditDensityKgM3();
            return Math.sqrt((4 * (wtKg / rho) * 1e6) / (Math.PI * lenCm));
        }
        return null;
    }

    function applyDiamEstimateToRow(tr, mode) {
        if (!tr || !mode || mode === 'manual') return false;
        const lenCm = parseFloat(tr.querySelector('.audit-row-len')?.value) || 0;
        const cbmPerRoll = parseFloat(tr.querySelector('.audit-row-cbm')?.value) || 0;
        const wtKg = parseFloat(tr.querySelector('.audit-row-wt')?.value) || 0;
        const estDiam = computeEstimatedDiamCm(lenCm, cbmPerRoll, wtKg, mode);
        if (!estDiam || !isFinite(estDiam) || estDiam <= 1) return false;

        const radInp = tr.querySelector('.audit-row-rad');
        const pairSpan = tr.querySelector('.audit-rad-pair');
        if (radInp) {
            radInp.value = auditRadMode === 'radius'
                ? parseFloat((estDiam / 2).toFixed(2))
                : parseFloat(estDiam.toFixed(2));
        }
        if (pairSpan) {
            pairSpan.textContent = auditRadMode === 'radius'
                ? `Ø = ${estDiam.toFixed(2)} cm`
                : `R = ${(estDiam / 2).toFixed(2)} cm`;
        }
        return true;
    }

    function recalculateAllAuditDiameters(silent = false) {
        const mode = auditDiamEstMode?.value || 'manual';
        if (mode === 'manual' || !auditFabricSkuBody) return;
        let updated = 0;
        auditFabricSkuBody.querySelectorAll('tr').forEach(tr => {
            if (applyDiamEstimateToRow(tr, mode)) updated++;
        });
        if (!silent) {
            if (updated > 0) {
                const labelMap = {
                    'box-cbm': 'CBM hộp bao √(CBM/L)',
                    'cyl-cbm': 'CBM hình trụ √(4·CBM/πL)',
                    'weight': `Cân nặng + Tỷ trọng ${getAuditDensityKgM3()} kg/m³`
                };
                showToast(`Đã quy đổi Ø cho ${updated} mã vải theo ${labelMap[mode] || mode}`);
            } else {
                showToast('Chưa có đủ dữ liệu CBM hoặc Cân nặng trên các dòng để quy đổi Ø!', true);
            }
        }
    }

    function updateAuditSkuTotalBadge() {
        if (!auditFabricSkuBody) return;
        let totSup = 0;
        let totLot = 0;
        auditFabricSkuBody.querySelectorAll('tr').forEach(tr => {
            totSup += (parseInt(tr.querySelector('.audit-row-sup-qty')?.value) || 0);
            totLot += (parseInt(tr.querySelector('.audit-row-lot-qty')?.value) || 0);
        });
        const supQtyHidden = document.getElementById('auditSupplierQty');
        if (supQtyHidden) supQtyHidden.value = totSup;
        if (auditSkuTotBadge) {
            auditSkuTotBadge.textContent = `Tổng lô: ${totLot.toLocaleString()} cây • NCC báo xếp: ${totSup.toLocaleString()} cây`;
        }
    }

    function addAuditFabricRow(row = {}) {
        if (!auditFabricSkuBody) return;
        const idx = auditFabricSkuBody.querySelectorAll('tr').length + 1;
        const lenCm = parseFloat(row.lenCm) || 160;
        const wt = row.wt ?? 28;
        const cbmPerRoll = (row.cbmPerRoll !== undefined && row.cbmPerRoll !== null)
            ? parseFloat(row.cbmPerRoll)
            : parseFloat((((parseFloat(row.diamCm) || 32) ** 2) * lenCm / 1e6).toFixed(3));
        const mode = auditDiamEstMode?.value || 'manual';
        const estDiam = (mode !== 'manual') ? computeEstimatedDiamCm(lenCm, cbmPerRoll, wt, mode) : null;
        const dCm = parseFloat(row.diamCm) || estDiam || 32;
        const dispVal = auditRadMode === 'radius' ? parseFloat((dCm / 2).toFixed(2)) : parseFloat(dCm.toFixed(2));
        const pairText = auditRadMode === 'radius' ? `Ø = ${parseFloat(dCm.toFixed(2))} cm` : `R = ${parseFloat((dCm / 2).toFixed(2))} cm`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="audit-row-idx" style="text-align:center;font-weight:700;">${idx}</td>
            <td><input type="text" class="audit-row-name" value="${String(row.name || `Vải mã ${idx}`).replace(/"/g, '&quot;')}"></td>
            <td><input type="number" class="audit-row-len" min="10" step="any" value="${parseFloat(lenCm.toFixed(1))}"></td>
            <td><input type="number" class="audit-row-cbm" min="0" step="0.001" value="${isFinite(cbmPerRoll) ? parseFloat(cbmPerRoll.toFixed(4)) : 0}"></td>
            <td>
                <input type="number" class="audit-row-rad" min="1" step="any" value="${dispVal}">
                <span class="audit-rad-pair">${pairText}</span>
            </td>
            <td><input type="number" class="audit-row-wt" min="0" step="0.1" value="${parseFloat(Number(wt).toFixed(2))}"></td>
            <td><input type="number" class="audit-row-lot-qty" min="1" value="${row.lotQty || 150}"></td>
            <td><input type="number" class="audit-row-sup-qty" min="0" value="${row.supQty ?? 120}"></td>
            <td style="text-align:center;"><button type="button" class="audit-del-row-btn" title="Xóa mã"><i class="fas fa-trash-alt"></i></button></td>
        `;

        const radInp = tr.querySelector('.audit-row-rad');
        const pairSpan = tr.querySelector('.audit-rad-pair');
        if (radInp && pairSpan) {
            radInp.addEventListener('input', () => {
                const v = parseFloat(radInp.value) || 0;
                pairSpan.textContent = auditRadMode === 'radius'
                    ? `Ø = ${parseFloat((v * 2).toFixed(2))} cm`
                    : `R = ${parseFloat((v / 2).toFixed(2))} cm`;
            });
        }
        tr.querySelectorAll('.audit-row-len, .audit-row-cbm, .audit-row-wt').forEach(inp => {
            inp.addEventListener('input', () => {
                const curMode = auditDiamEstMode?.value || 'manual';
                if (curMode !== 'manual') applyDiamEstimateToRow(tr, curMode);
            });
        });
        tr.querySelectorAll('.audit-row-lot-qty, .audit-row-sup-qty').forEach(inp => {
            inp.addEventListener('input', updateAuditSkuTotalBadge);
        });
        tr.querySelector('.audit-del-row-btn')?.addEventListener('click', () => {
            if (auditFabricSkuBody.querySelectorAll('tr').length > 1) {
                tr.remove();
                auditFabricSkuBody.querySelectorAll('tr').forEach((r, i) => {
                    const c = r.querySelector('.audit-row-idx');
                    if (c) c.textContent = i + 1;
                });
                updateAuditSkuTotalBadge();
            } else {
                showToast('Cần ít nhất 1 mã cuộn vải trong bảng kiểm tra!', true);
            }
        });

        auditFabricSkuBody.appendChild(tr);
        updateAuditSkuTotalBadge();
    }

    function setAuditFabricRows(rows) {
        if (!auditFabricSkuBody) return;
        auditFabricSkuBody.innerHTML = '';
        rows.forEach(r => addAuditFabricRow(r));
    }

    if (auditDiamEstMode) {
        auditDiamEstMode.addEventListener('change', () => {
            const m = auditDiamEstMode.value;
            if (auditDensityWrap) auditDensityWrap.style.display = (m === 'weight') ? 'inline-flex' : 'none';
            if (m !== 'manual') recalculateAllAuditDiameters(false);
        });
    }
    if (auditDensityPreset && auditDensityCustom) {
        auditDensityPreset.addEventListener('change', () => {
            if (auditDensityPreset.value !== 'custom') {
                auditDensityCustom.value = auditDensityPreset.value;
                if (auditDiamEstMode?.value === 'weight') recalculateAllAuditDiameters(false);
            }
        });
        auditDensityCustom.addEventListener('input', () => {
            if (auditDensityPreset) auditDensityPreset.value = 'custom';
            if (auditDiamEstMode?.value === 'weight') recalculateAllAuditDiameters(true);
        });
    }
    if (btnRecalcAuditDiam) {
        btnRecalcAuditDiam.addEventListener('click', () => {
            if (auditDiamEstMode?.value === 'manual') {
                auditDiamEstMode.value = 'box-cbm';
            }
            recalculateAllAuditDiameters(false);
        });
    }

    // ===== Supplier Packing List (Excel / CSV / Paste) Smart Parser =====
    function parsePlNumeric(val) {
        if (typeof val === 'number') return isFinite(val) ? val : 0;
        const s = String(val || '').replace(/,/g, '').trim();
        const m = s.match(/-?\d+(\.\d+)?/);
        return m ? parseFloat(m[0]) : 0;
    }

    function normalizeWidthCm(rawW) {
        const w = parsePlNumeric(rawW);
        if (!w || w <= 0) return 0;
        if (w < 5) return Math.round(w * 100 * 10) / 10; // meters -> cm
        if (w > 450) return Math.round((w / 10) * 10) / 10; // mm -> cm
        return Math.round(w * 10) / 10;
    }

    function parseSupplierPackingListMatrix(matrixRows, sourceName = 'Packing List NCC', sheetName = '') {
        if (!Array.isArray(matrixRows) || matrixRows.length === 0) return null;
        const sheetContMatch = String(sheetName || '').trim().match(/\b[A-Z]{4}\d{7}\b/);
        const defaultCont = sheetContMatch ? sheetContMatch[0] : 'CHUNG';

        // 1. Locate header row by keyword scoring
        let headerIdx = -1;
        let bestScore = 0;
        const colMap = { cont: -1, desc: -1, color: -1, width: -1, qty: -1, nw: -1, cbm: -1, lot: -1 };

        for (let r = 0; r < Math.min(45, matrixRows.length); r++) {
            const row = matrixRows[r] || [];
            let score = 0;
            let qtyPrio = 0;
            const tempMap = { cont: -1, desc: -1, color: -1, width: -1, qty: -1, nw: -1, cbm: -1, lot: -1 };
            row.forEach((cell, c) => {
                const txt = String(cell || '').toLowerCase().replace(/\s+/g, ' ').trim();
                if (!txt) return;
                if (tempMap.cont < 0 && /(container|cont\b|cntr)/.test(txt)) { tempMap.cont = c; score += 3; }
                if (tempMap.width < 0 && /(width|khổ|kho\b|w\(cm\))/.test(txt)) { tempMap.width = c; score += 3; }
                if (tempMap.nw < 0 && /(n\.w|net\s*w|weight|k\.l|trọng lượng|nw\b)/.test(txt) && !/gross|g\.w/.test(txt)) { tempMap.nw = c; score += 3; }
                if (tempMap.cbm < 0 && /(volume|cbm|cube|m3|m³)/.test(txt)) { tempMap.cbm = c; score += 3; }

                // Prioritize PKGS / ROLLS count; NEVER match "ROLL NO" / "CTN NO" / "QTY (YARDS)"
                if (!/(yds|yard|meter|metre|price|amount|usd|unit|no\.|no\b|#|\bid\b|code|rfid)/.test(txt)) {
                    if (/(pkgs|pkg|rolls|cây|cuộn|kiện|bale)/.test(txt) && qtyPrio < 2) {
                        tempMap.qty = c;
                        if (qtyPrio === 0) score += 3;
                        qtyPrio = 2;
                    } else if (/(qty|q'ty|sl|pcs|ctn)/.test(txt) && qtyPrio < 1) {
                        tempMap.qty = c;
                        score += 1;
                        qtyPrio = 1;
                    }
                }

                if (tempMap.desc < 0 && /(desc|item|fabric|style|art|mã|tên|quality|iman)/.test(txt)) { tempMap.desc = c; score += 2; }
                if (tempMap.color < 0 && /(color|colour|màu)/.test(txt)) { tempMap.color = c; score += 1; }
                if (tempMap.lot < 0 && /(lot|batch|dye)/.test(txt)) { tempMap.lot = c; score += 1; }
            });
            if (score > bestScore && (tempMap.width >= 0 || tempMap.nw >= 0 || tempMap.cbm >= 0)) {
                bestScore = score;
                headerIdx = r;
                Object.assign(colMap, tempMap);
            }
        }

        if (headerIdx < 0 || (colMap.width < 0 && colMap.nw < 0 && colMap.cbm < 0)) {
            return null;
        }

        // 2. Scan data rows after headerIdx
        let currentCont = defaultCont;
        const groups = new Map(); // key = cont||name||widthCm

        for (let r = headerIdx + 1; r < matrixRows.length; r++) {
            const row = matrixRows[r] || [];
            const rowJoined = row.map(x => String(x || '').trim()).join(' ').trim();
            if (!rowJoined) continue;
            if (/^(total|sub\s*total|grand\s*total|tổng|measurement)/i.test(rowJoined)) continue;

            // Detect container number anywhere in container col or row
            const contCell = colMap.cont >= 0 ? String(row[colMap.cont] || '').trim() : '';
            const contMatch = (contCell + ' ' + rowJoined).match(/\b[A-Z]{4}\d{7}\b/);
            if (contMatch) {
                currentCont = contMatch[0];
            } else if (contCell && contCell.length >= 4 && !/^(total|summary)/i.test(contCell)) {
                currentCont = contCell;
            }

            const widthCm = colMap.width >= 0 ? normalizeWidthCm(row[colMap.width]) : 0;
            const nw = colMap.nw >= 0 ? parsePlNumeric(row[colMap.nw]) : 0;
            const cbm = colMap.cbm >= 0 ? parsePlNumeric(row[colMap.cbm]) : 0;
            let qty = colMap.qty >= 0 ? Math.round(parsePlNumeric(row[colMap.qty])) : 0;

            // Skip non-data / header-repeat / empty metric rows
            if (widthCm <= 0 || (nw <= 0 && cbm <= 0)) continue;
            if (qty <= 0) qty = 1; // roll-by-roll row without PKGS count

            const descRaw = colMap.desc >= 0 ? String(row[colMap.desc] || '').trim() : '';
            const colorRaw = colMap.color >= 0 ? String(row[colMap.color] || '').trim() : '';
            const lotRaw = colMap.lot >= 0 ? String(row[colMap.lot] || '').trim() : '';
            let baseName = [descRaw, colorRaw].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
            if (!baseName) baseName = lotRaw ? `Lot ${lotRaw}` : `Vải ${widthCm}cm`;
            if (baseName.length > 36) baseName = baseName.slice(0, 36).trim();

            const skuKey = `${currentCont}|||${baseName}|||${widthCm}`;
            if (!groups.has(skuKey)) {
                groups.set(skuKey, {
                    containerNo: currentCont,
                    name: `${baseName} (${widthCm}cm)`,
                    lenCm: widthCm,
                    totalQty: 0,
                    totalNw: 0,
                    totalCbm: 0
                });
            }
            const g = groups.get(skuKey);
            g.totalQty += qty;
            g.totalNw += nw;
            g.totalCbm += cbm;
        }

        if (groups.size === 0) return null;

        // 3. Build per-container & aggregate lists
        const containers = new Map();
        const allRows = [];
        const oceanContPattern = /^[A-Z]{4}\d{7}$/;

        groups.forEach(g => {
            const wtPerRoll = g.totalQty > 0 ? (g.totalNw / g.totalQty) : 0;
            const cbmPerRoll = g.totalQty > 0 ? (g.totalCbm / g.totalQty) : 0;
            const item = {
                containerNo: g.containerNo,
                name: g.name,
                lenCm: g.lenCm,
                wt: wtPerRoll,
                cbmPerRoll: cbmPerRoll,
                lotQty: g.totalQty,
                supQty: g.totalQty
            };
            allRows.push(item);
            if (!containers.has(g.containerNo)) containers.set(g.containerNo, []);
            containers.get(g.containerNo).push(item);
        });

        return buildPlBundle(sourceName, containers, allRows);
    }

    function buildPlBundle(sourceName, containers, allRows) {
        const oceanContPattern = /^[A-Z]{4}\d{7}$/;
        const oceanContKeys = Array.from(containers.keys()).filter(k => oceanContPattern.test(k));
        const targetKeys = oceanContKeys.length > 0 ? oceanContKeys : Array.from(containers.keys());
        const mergedMap = new Map();
        targetKeys.forEach(ck => {
            (containers.get(ck) || []).forEach(it => {
                const mk = `${it.name}|||${it.lenCm}`;
                if (!mergedMap.has(mk)) {
                    mergedMap.set(mk, { ...it, totalNw: it.wt * it.lotQty, totalCbm: it.cbmPerRoll * it.lotQty });
                } else {
                    const m = mergedMap.get(mk);
                    m.lotQty += it.lotQty;
                    m.supQty += it.supQty;
                    m.totalNw += it.wt * it.lotQty;
                    m.totalCbm += it.cbmPerRoll * it.lotQty;
                    m.wt = m.totalNw / m.lotQty;
                    m.cbmPerRoll = m.totalCbm / m.lotQty;
                }
            });
        });

        return {
            sourceName,
            containers,
            oceanContCount: oceanContKeys.length > 0 ? oceanContKeys.length : containers.size,
            allOceanRows: Array.from(mergedMap.values()),
            allRows
        };
    }

    function applyImportedPlSelection(selectionKey) {
        if (!importedPlData) return;
        let rows = [];
        let contCount = 1;
        if (selectionKey === '__ALL_OCEAN__') {
            rows = importedPlData.allOceanRows;
            contCount = Math.max(1, importedPlData.oceanContCount);
        } else {
            rows = importedPlData.containers.get(selectionKey) || [];
            contCount = 1;
        }

        const hasCbm = rows.some(r => r.cbmPerRoll > 0);
        if (auditDiamEstMode) {
            auditDiamEstMode.value = hasCbm ? 'box-cbm' : 'weight';
            if (auditDensityWrap) auditDensityWrap.style.display = hasCbm ? 'none' : 'inline-flex';
        }

        const supCntInp = document.getElementById('auditContCount');
        if (supCntInp) supCntInp.value = contCount;
        const supNameInp = document.getElementById('auditSupplierName');
        if (supNameInp && importedPlData.sourceName) {
            supNameInp.value = importedPlData.sourceName.replace(/\.(xlsx|xls|csv)$/i, '');
        }

        setAuditFabricRows(rows);
        recalculateAllAuditDiameters(true);

        const totRolls = rows.reduce((s, r) => s + r.lotQty, 0);
        const totCbm = rows.reduce((s, r) => s + r.cbmPerRoll * r.lotQty, 0);
        const totWt = rows.reduce((s, r) => s + r.wt * r.lotQty, 0);
        if (auditPlSummaryInfo) {
            auditPlSummaryInfo.innerHTML = `<i class="fas fa-check-circle"></i> <strong>${importedPlData.sourceName}</strong>: ${rows.length} nhóm mã • <strong>${totRolls.toLocaleString()}</strong> cuộn • <strong>${totCbm.toFixed(2)} CBM</strong> • <strong>${totWt.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg</strong> (Đang quy đổi Ø theo <strong>${hasCbm ? 'Box-CBM' : 'Cân nặng'}</strong>)`;
        }
    }

    function loadParsedPlIntoUI(parsed) {
        if (!parsed) {
            showToast('Không nhận diện được bảng Packing List (cần có cột Khổ vải/Width và Cân nặng hoặc CBM)!', true);
            return;
        }
        importedPlData = parsed;
        if (auditPlFilterBar) auditPlFilterBar.style.display = 'flex';
        if (auditPlContainerFilter) {
            auditPlContainerFilter.innerHTML = '';
            const optAll = document.createElement('option');
            optAll.value = '__ALL_OCEAN__';
            const totOceanRolls = parsed.allOceanRows.reduce((s, r) => s + r.lotQty, 0);
            optAll.textContent = `Tất cả Cont (${parsed.oceanContCount} cont • ${totOceanRolls.toLocaleString()} cuộn)`;
            auditPlContainerFilter.appendChild(optAll);

            parsed.containers.forEach((cRows, cNo) => {
                const opt = document.createElement('option');
                opt.value = cNo;
                const cRolls = cRows.reduce((s, r) => s + r.lotQty, 0);
                const cCbm = cRows.reduce((s, r) => s + r.cbmPerRoll * r.lotQty, 0);
                opt.textContent = `Cont ${cNo} (${cRolls.toLocaleString()} cuộn • ${cCbm.toFixed(1)} CBM)`;
                auditPlContainerFilter.appendChild(opt);
            });
            auditPlContainerFilter.value = '__ALL_OCEAN__';
        }
        applyImportedPlSelection('__ALL_OCEAN__');
        showToast(`Đã nạp Packing List "${parsed.sourceName}" (${parsed.containers.size} container/nhóm)!`);
    }

    if (auditPlContainerFilter) {
        auditPlContainerFilter.addEventListener('change', () => {
            applyImportedPlSelection(auditPlContainerFilter.value);
        });
    }

    if (btnImportSupplierPl && supplierPlFileInput) {
        btnImportSupplierPl.addEventListener('click', () => supplierPlFileInput.click());
        supplierPlFileInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (typeof XLSX === 'undefined') {
                showToast('Thư viện đọc Excel chưa sẵn sàng!', true);
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const wb = file.name.toLowerCase().endsWith('.csv')
                        ? XLSX.read(new TextDecoder('utf-8').decode(ev.target.result), { type: 'string' })
                        : XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
                    const contSheetParses = [];
                    let bestParsed = null;
                    let bestSheetScore = -1;
                    wb.SheetNames.forEach(sn => {
                        const ws = wb.Sheets[sn];
                        const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                        const p = parseSupplierPackingListMatrix(matrix, file.name, sn);
                        if (p) {
                            if (/^[A-Z]{4}\d{7}$/.test(sn.trim())) {
                                contSheetParses.push(p);
                            }
                            const totCbm = p.allRows.reduce((s, r) => s + r.cbmPerRoll * r.lotQty, 0);
                            const totRolls = p.allRows.reduce((s, r) => s + r.lotQty, 0);
                            const hasRealCont = Array.from(p.containers.keys()).some(k => /^[A-Z]{4}\d{7}$/.test(k));
                            const sheetScore = (hasRealCont ? 5000 : 0) + (/pack|pl\b|detail/i.test(sn) ? 1000 : 0) + totCbm * 10 + Math.min(totRolls, 2000);
                            if (sheetScore > bestSheetScore) {
                                bestSheetScore = sheetScore;
                                bestParsed = p;
                            }
                        }
                    });
                    if (contSheetParses.length >= 2) {
                        const combinedContainers = new Map();
                        const combinedAllRows = [];
                        contSheetParses.forEach(cp => {
                            cp.containers.forEach((rows, cNo) => {
                                combinedContainers.set(cNo, rows);
                                combinedAllRows.push(...rows);
                            });
                        });
                        bestParsed = buildPlBundle(file.name, combinedContainers, combinedAllRows);
                    }
                    loadParsedPlIntoUI(bestParsed);
                } catch (err) {
                    console.error(err);
                    showToast('Lỗi đọc file Packing List NCC!', true);
                }
            };
            reader.readAsArrayBuffer(file);
            supplierPlFileInput.value = '';
        });
    }

    if (btnPasteSupplierPl && auditPlPasteBox) {
        btnPasteSupplierPl.addEventListener('click', () => {
            auditPlPasteBox.style.display = auditPlPasteBox.style.display === 'none' ? 'block' : 'none';
        });
    }
    if (btnCloseAuditPlPaste && auditPlPasteBox) {
        btnCloseAuditPlPaste.addEventListener('click', () => { auditPlPasteBox.style.display = 'none'; });
    }
    if (btnParseAuditPlPaste && auditPlPasteInput) {
        btnParseAuditPlPaste.addEventListener('click', () => {
            const raw = (auditPlPasteInput.value || '').trim();
            if (!raw) {
                showToast('Vui lòng dán nội dung bảng Packing List vào ô trống!', true);
                return;
            }
            const lines = raw.split(/\r?\n/).map(l => l.split(/\t|,(?=(?:[^"]*"[^"]*")*[^"]*$)/));
            const parsed = parseSupplierPackingListMatrix(lines, 'Packing List dán từ Excel');
            if (parsed && auditPlPasteBox) auditPlPasteBox.style.display = 'none';
            loadParsedPlIntoUI(parsed);
        });
    }

    function getAuditFabricCargoItems() {
        if (!auditFabricSkuBody) return [];
        const items = [];
        auditFabricSkuBody.querySelectorAll('tr').forEach((tr, idx) => {
            const name = (tr.querySelector('.audit-row-name')?.value || `Vải mã ${idx + 1}`).trim();
            const lenCm = parseFloat(tr.querySelector('.audit-row-len')?.value) || 160;
            const rawRad = parseFloat(tr.querySelector('.audit-row-rad')?.value) || 32;
            const diamCm = auditRadMode === 'radius' ? (rawRad * 2) : rawRad;
            const wt = Math.max(0, parseFloat(tr.querySelector('.audit-row-wt')?.value) || 0);
            const lotQty = Math.max(1, parseInt(tr.querySelector('.audit-row-lot-qty')?.value) || 1);
            const supQty = Math.max(0, parseInt(tr.querySelector('.audit-row-sup-qty')?.value) || 0);

            items.push({
                name,
                lCm: lenCm,
                wCm: diamCm,
                hCm: diamCm,
                length: lenCm,
                width: diamCm,
                height: diamCm,
                qty: lotQty,
                supQty: supQty,
                weight: wt,
                color: defaultColors[idx % defaultColors.length],
                type: 'fabric',
                rotation: 'fit',
                stackable: true,
                stop: 'Stop 1'
            });
        });
        return items;
    }

    if (auditRadiusSwitcher) {
        auditRadiusSwitcher.querySelectorAll('.unit-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newMode = btn.getAttribute('data-rad-mode') || 'diameter';
                if (newMode === auditRadMode) return;
                const oldMode = auditRadMode;
                auditRadMode = newMode;
                auditRadiusSwitcher.querySelectorAll('.unit-btn').forEach(b => b.classList.toggle('active', b === btn));
                if (auditRadColHeader) {
                    auditRadColHeader.textContent = newMode === 'radius' ? 'R Bán kính (cm)' : 'Ø Đường kính (cm)';
                }
                if (auditFabricSkuBody) {
                    auditFabricSkuBody.querySelectorAll('tr').forEach(tr => {
                        const inp = tr.querySelector('.audit-row-rad');
                        const pairSpan = tr.querySelector('.audit-rad-pair');
                        if (!inp) return;
                        const v = parseFloat(inp.value) || 0;
                        const diamCm = oldMode === 'radius' ? (v * 2) : v;
                        inp.value = newMode === 'radius' ? parseFloat((diamCm / 2).toFixed(2)) : parseFloat(diamCm.toFixed(2));
                        if (pairSpan) {
                            pairSpan.textContent = newMode === 'radius'
                                ? `Ø = ${parseFloat(diamCm.toFixed(2))} cm`
                                : `R = ${parseFloat((diamCm / 2).toFixed(2))} cm`;
                        }
                    });
                }
                showToast(`Đã chuyển cột nhập sang ${newMode === 'radius' ? 'Bán kính R (cm)' : 'Đường kính Ø (cm)'}`);
            });
        });
    }

    if (btnAddAuditFabricRow) {
        btnAddAuditFabricRow.addEventListener('click', () => addAuditFabricRow());
    }

    // Seed default 3 fabric rows on startup so table is immediately ready for input
    setAuditFabricRows([
        { name: 'Vải Kaki 160cm', lenCm: 160, diamCm: 32, wt: 28, lotQty: 180, supQty: 150 },
        { name: 'Vải Denim 150cm', lenCm: 150, diamCm: 34, wt: 32, lotQty: 110, supQty: 90 },
        { name: 'Vải Thun Cotton 175cm', lenCm: 175, diamCm: 28, wt: 22, lotQty: 95, supQty: 40 }
    ]);

    if (btnLoadFabricSample) {
        btnLoadFabricSample.addEventListener('click', () => {
            importedPlData = null;
            if (auditPlFilterBar) auditPlFilterBar.style.display = 'none';
            if (auditDiamEstMode) auditDiamEstMode.value = 'manual';
            if (auditDensityWrap) auditDensityWrap.style.display = 'none';

            setAuditFabricRows([
                { name: 'Vải Kaki 160cm', lenCm: 160, diamCm: 32, wt: 28, lotQty: 180, supQty: 145 },
                { name: 'Vải Denim 150cm', lenCm: 150, diamCm: 34, wt: 32, lotQty: 110, supQty: 85 },
                { name: 'Vải Thun Cotton 175cm', lenCm: 175, diamCm: 28, wt: 22, lotQty: 95, supQty: 30 }
            ]);
            const supTypeSel = document.getElementById('auditContType');
            const supCntInp = document.getElementById('auditContCount');
            const supMethodSel = document.getElementById('auditSupplierMethod');
            const supNoteInp = document.getElementById('auditSupplierNote');
            if (supTypeSel) supTypeSel.value = '40hc';
            if (supCntInp) supCntInp.value = 1;
            if (supMethodSel) supMethodSel.value = 'squareX';
            if (supNoteInp) supNoteInp.value = 'NCC xếp thẳng không sole, báo cont 40HC chỉ vừa 260 cây, dư 125 cây đòi đi thêm cont/LCL';

            showToast('Đã nạp mẫu 3 mã Cuộn vải (385 cây) — đang đối chiếu cách xếp của NCC!');
            setTimeout(() => {
                if (btnRunSupplierAudit) btnRunSupplierAudit.click();
            }, 250);
        });
    }

    if (btnUploadSupplierPhoto && supplierPhotoInput) {
        btnUploadSupplierPhoto.addEventListener('click', () => supplierPhotoInput.click());
        supplierPhotoInput.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                uploadedSupplierPhotoUrl = ev.target.result;
                if (supplierPhotoPreview) {
                    supplierPhotoPreview.src = uploadedSupplierPhotoUrl;
                    supplierPhotoPreview.style.display = 'block';
                }
                const ph = supplierPhotoWrap?.querySelector('.compare-placeholder');
                if (ph) ph.style.display = 'none';
                showToast('Đã tải ảnh chụp thực tế của NCC để đối chiếu!');
            };
            reader.readAsDataURL(file);
        });
    }

    function runSupplierAudit() {
        if (!simulation) return;
        const auditItems = getAuditFabricCargoItems();
        if (!auditItems || auditItems.length === 0) {
            showToast('Vui lòng nhập ít nhất 1 mã cuộn vải trong bảng kiểm tra!', true);
            return;
        }

        const supName = (document.getElementById('auditSupplierName')?.value || 'Nhà cung cấp Vải').trim();
        const contType = document.getElementById('auditContType')?.value || '40hc';
        const contCount = Math.max(1, parseInt(document.getElementById('auditContCount')?.value) || 1);
        const supMethod = document.getElementById('auditSupplierMethod')?.value || 'squareX';
        const supQty = auditItems.reduce((s, it) => s + (it.supQty || 0), 0);
        const totalLotQty = auditItems.reduce((s, it) => s + (it.qty || 0), 0);
        const supNote = (document.getElementById('auditSupplierNote')?.value || '').trim();
        const auditPayload = document.getElementById('auditEnforcePayload')?.checked !== false;
        const selectedAlgo = document.querySelector('input[name="algorithm"]:checked')?.value || 'best-balance';

        // Keep Export cargo cards untouched so Export & Supplier Audit remain independent tools
        const auditFleet = Array(contCount).fill(contType);

        // 1. Capacity under Supplier's claimed loading method (e.g. squareX = no stagger, or crosswise)
        const methodRes = simulation.packMultiContainers(auditItems, selectedAlgo, auditFleet, {
            marginL: 2, marginW: 2, marginH: 0,
            enforceDoorClearance: isDoorClearanceEnforced(),
            enforcePayload: auditPayload,
            fabricMode: supMethod
        });
        const methodCap = methodRes.totalPlaced;
        const methodUtil = methodRes.containers[0]?.utilization || '0.0';

        // 2. Physical Max (0% margin, optimal hexagonal nesting)
        const maxRes = simulation.packMultiContainers(auditItems, selectedAlgo, auditFleet, {
            marginL: 0, marginW: 0, marginH: 0,
            enforceDoorClearance: isDoorClearanceEnforced(),
            enforcePayload: auditPayload,
            fabricMode: 'auto'
        });
        const maxCap = maxRes.totalPlaced;

        // 3. Optimal AI TNG Benchmark (2% L/W shrink margin + optimal hex nesting + crosswise door fill) — displayed in 3D canvas
        const practRes = simulation.packMultiContainers(auditItems, selectedAlgo, auditFleet, {
            marginL: 2, marginW: 2, marginH: 0,
            enforceDoorClearance: isDoorClearanceEnforced(),
            enforcePayload: auditPayload,
            fabricMode: 'auto'
        });
        const practicalCap = practRes.totalPlaced;
        const practicalUtil = practRes.containers[0]?.utilization || '0.0';

        // Sync main simulator UI to show the optimal audited fleet
        activeContainers = auditFleet.slice();
        selectedEquipment = contType;
        renderContainerTabs(practRes);
        updateUIWithSimulationResult(practRes.activeContainerStats || practRes);

        // Capture live 3D Door View snapshot
        const doorImg = simulation.captureDoorSnapshot(0);
        if (doorImg && audit3dDoorPreview) {
            audit3dDoorPreview.src = doorImg;
            audit3dDoorPreview.style.display = 'block';
            if (audit3dDoorPlaceholder) audit3dDoorPlaceholder.style.display = 'none';
        }

        // Compute Verdict (evaluates BOTH quantity accuracy AND space optimization of supplier's method)
        let status = 'ok';
        let pillText = '🟢 TỐI ƯU & ĐẠT CHUẨN';
        let msg = '';
        const diffPract = practicalCap - supQty;
        const methodGap = practicalCap - methodCap;
        const ratioPct = practicalCap > 0 ? ((supQty / practicalCap) * 100).toFixed(1) : '100.0';

        if (supQty > maxCap) {
            status = 'danger';
            pillText = '🔴 BẤT THƯỜNG — NGHI VẤN KHAI KHỐNG';
            msg = `NCC báo đã đóng ${supQty.toLocaleString()} cây vào ${contCount}×${contType.toUpperCase()}, nhưng trần vật lý tối đa (0% sai số${auditPayload ? ' & tải trọng' : ''}) chỉ chứa được ${maxCap.toLocaleString()} cây. Cần yêu cầu NCC đo lại đường kính/bán kính cuộn vải hoặc kiểm tra lại Packing List!`;
        } else if (supQty < Math.floor(practicalCap * 0.94)) {
            status = 'warn';
            pillText = '🟡 CHƯA TỐI ƯU KHÔNG GIAN CONT';
            const methodNote = (supMethod !== 'auto' && methodGap > 0)
                ? ` Cách NCC đang xếp (${methodCap.toLocaleString()} cây, ${methodUtil}% cont) mất ${methodGap.toLocaleString()} cây do chưa xếp sole tổ ong / chưa tận dụng khe cửa.`
                : '';
            msg = `NCC báo xếp được ${supQty.toLocaleString()}/${totalLotQty.toLocaleString()} cây (đạt ${ratioPct}% năng lực).${methodNote} Phương án tối ưu AI TNG (xếp sole tổ ong) xếp được ${practicalCap.toLocaleString()} cây (${practicalUtil}% cont) — TĂNG THÊM +${diffPract.toLocaleString()} CÂY!`;
        } else {
            status = 'ok';
            pillText = '🟢 TỐI ƯU & ĐẠT CHUẨN';
            msg = `Cách sắp xếp của NCC (${supQty.toLocaleString()} cây) đã tối ưu tốt không gian cont, đạt ${ratioPct}% so với phương án tối ưu AI TNG (${practicalCap.toLocaleString()} cây, ${practicalUtil}% thể tích; trần 0%: ${maxCap.toLocaleString()} cây).`;
        }

        if (auditVerdictBox) auditVerdictBox.style.display = 'block';
        if (auditVerdictPill) {
            auditVerdictPill.textContent = pillText;
            auditVerdictPill.className = `verdict-pill verdict-${status}`;
        }
        if (auditVerdictMsg) auditVerdictMsg.textContent = msg;

        const elSup = document.getElementById('vKpiSupplier');
        const elMeth = document.getElementById('vKpiMethodCap');
        const elPra = document.getElementById('vKpiPractical');
        const elMax = document.getElementById('vKpiMax');
        if (elSup) elSup.textContent = `${supQty.toLocaleString()} cây`;
        if (elMeth) elMeth.textContent = `${methodCap.toLocaleString()} cây (${methodUtil}%)`;
        if (elPra) elPra.textContent = `${practicalCap.toLocaleString()} cây (${practicalUtil}%)`;
        if (elMax) elMax.textContent = `${maxCap.toLocaleString()} cây`;

        lastAuditReport = {
            supName, contType, contCount, supQty, totalLotQty, supNote, supMethod, auditPayload,
            methodCap, methodUtil, practicalCap, practicalUtil, maxCap, diffPract, ratioPct, status, pillText, msg,
            doorImg,
            auditItems,
            reportContainers: simulation.captureAllContainersReportData()
        };
    }

    if (btnRunSupplierAudit) {
        btnRunSupplierAudit.addEventListener('click', runSupplierAudit);
    }

    if (btnExportAuditPdf) {
        btnExportAuditPdf.addEventListener('click', () => {
            if (!lastAuditReport) runSupplierAudit();
            if (!lastAuditReport || !loadingPlanModal || !loadingPlanPrintSheet) return;

            const r = lastAuditReport;
            const todayStr = new Date().toLocaleDateString('vi-VN');
            const c0 = r.reportContainers[0] || {};
            const skuRows = (c0.skuManifest || []).map((sku, i) => `
                <tr>
                    <td style="text-align:center;">${i + 1}</td>
                    <td><span class="plan-color-dot" style="background:${sku.color};"></span><strong>${sku.name}</strong></td>
                    <td>${sku.dimLcm} × Ø${sku.dimWcm} cm</td>
                    <td style="text-align:right;font-weight:700;">${sku.qty.toLocaleString()}</td>
                    <td><strong>${sku.lanes} làn × ${sku.layers} tầng</strong></td>
                    <td>${sku.oriLabel}</td>
                    <td style="text-align:right;">${sku.cbmTotal.toFixed(3)}</td>
                </tr>
            `).join('');

            const photoBlock = uploadedSupplierPhotoUrl
                ? `<div class="plan-view-card"><div class="plan-view-label">SUPPLIER ACTUAL PHOTO / ẢNH THỰC TẾ NCC</div><img src="${uploadedSupplierPhotoUrl}" alt="Supplier Photo"></div>`
                : `<div class="plan-view-card"><div class="plan-view-label">SIDE VIEW / NHÌN BÊN HÔNG 3D</div><img src="${c0.snapshots?.side || ''}" alt="3D Side View"></div>`;

            loadingPlanPrintSheet.innerHTML = `
                <div class="plan-container-page">
                    <div class="plan-page-header">
                        <div>
                            <div class="plan-brand-title">TNG LOGISTICS • SUPPLIER CONTAINER LOADING AUDIT REPORT (VI / EN)</div>
                            <div class="plan-brand-sub">BÁO CÁO ĐỐI CHIẾU TẢI HÀNG NHÀ CUNG CẤP &nbsp;|&nbsp; Supplier: <strong>${r.supName}</strong> &nbsp;|&nbsp; Date: <strong>${todayStr}</strong></div>
                            <div class="plan-brand-sub">Equipment: <strong>${r.contCount}×${r.contType.toUpperCase()}</strong> &nbsp;|&nbsp; Note: ${r.supNote || 'N/A'}</div>
                        </div>
                        <div class="plan-cont-badge-box">
                            <span class="plan-cont-pill">${r.pillText}</span>
                            <div class="plan-meta-sub">TNG Practical Benchmark (2% margin)</div>
                        </div>
                    </div>

                    <div class="audit-pdf-verdict-banner">${r.msg}</div>

                    <div class="plan-kpi-strip" style="grid-template-columns: repeat(4, 1fr);">
                        <div class="plan-kpi-card"><span>Supplier Claim / NCC báo</span><strong>${r.supQty.toLocaleString()} pcs</strong></div>
                        <div class="plan-kpi-card"><span>TNG Practical / Chuẩn 2%</span><strong style="color:#0d9488;">${r.practicalCap.toLocaleString()} pcs</strong></div>
                        <div class="plan-kpi-card"><span>Physical Max / Trần 0%</span><strong>${r.maxCap.toLocaleString()} pcs</strong></div>
                        <div class="plan-kpi-card"><span>Difference / Chênh lệch</span><strong>${r.diffPract >= 0 ? '+' + r.diffPract : r.diffPract} pcs (${r.ratioPct}%)</strong></div>
                    </div>

                    <div class="plan-views-grid">
                        ${photoBlock}
                        <div class="plan-view-card"><div class="plan-view-label">TNG 3D DOOR VIEW / CỬA CONT 3D</div><img src="${r.doorImg || c0.snapshots?.isometric || ''}" alt="3D Door"></div>
                        <div class="plan-view-card"><div class="plan-view-label">TNG 3D TOP VIEW / SƠ ĐỒ LÀN XẾP</div><img src="${c0.snapshots?.top || ''}" alt="3D Top"></div>
                    </div>

                    <div class="plan-section-heading">
                        <span>RECOMMENDED LOADING PATTERN / HƯỚNG DẪN XẾP CHUẨN TNG (HEXAGONAL NESTING)</span>
                        <span>${(c0.skuManifest || []).length} SKUs</span>
                    </div>
                    <table class="plan-sku-table">
                        <thead>
                            <tr>
                                <th style="width:34px;text-align:center;">#</th>
                                <th>Item / Mã hàng</th>
                                <th>Dims / Kích thước</th>
                                <th style="text-align:right;">Qty / SL</th>
                                <th>Pattern / Bố trí</th>
                                <th>Orientation / Hướng</th>
                                <th style="text-align:right;">CBM (m³)</th>
                            </tr>
                        </thead>
                        <tbody>${skuRows}</tbody>
                    </table>
                </div>
            `;
            loadingPlanModal.style.display = 'flex';
        });
    }

    // 9. SheetJS Excel & CSV Integration (Template, Export, Import)
    const btnDownloadTemplate = document.getElementById('btnDownloadTemplate');
    const btnExportExcel = document.getElementById('btnExportExcel');
    const btnImportExcel = document.getElementById('btnImportExcel');
    const excelFileInput = document.getElementById('excelFileInput');

    if (btnDownloadTemplate) {
        btnDownloadTemplate.addEventListener('click', () => {
            if (typeof XLSX === 'undefined') {
                alert('Thư viện Excel đang tải, vui lòng thử lại sau giây lát!');
                return;
            }
            const sampleData = [
                {
                    "Tên kiện hàng (Item Name)": "Thùng Carton Thiết Bị A",
                    "Dài (cm)": 60,
                    "Rộng (cm)": 50,
                    "Cao (cm)": 40,
                    "Số lượng (Qty)": 80,
                    "Trọng lượng mỗi kiện (kg)": 15,
                    "Màu sắc (Hex)": "#dc2626",
                    "Xếp chồng (1=Có, 0=Không)": 1,
                    "Khóa xoay (1=Khóa, 0=Tự do)": 0,
                    "Điểm dỡ hàng (Stop)": "Stop 1",
                    "Độ ưu tiên (1-5)": 1
                },
                {
                    "Tên kiện hàng (Item Name)": "Kiện Phụ Tùng B",
                    "Dài (cm)": 40,
                    "Rộng (cm)": 40,
                    "Cao (cm)": 30,
                    "Số lượng (Qty)": 120,
                    "Trọng lượng mỗi kiện (kg)": 10,
                    "Màu sắc (Hex)": "#2563eb",
                    "Xếp chồng (1=Có, 0=Không)": 1,
                    "Khóa xoay (1=Khóa, 0=Tự do)": 0,
                    "Điểm dỡ hàng (Stop)": "Stop 2",
                    "Độ ưu tiên (1-5)": 2
                },
                {
                    "Tên kiện hàng (Item Name)": "Pallet Hàng C",
                    "Dài (cm)": 120,
                    "Rộng (cm)": 100,
                    "Cao (cm)": 80,
                    "Số lượng (Qty)": 10,
                    "Trọng lượng mỗi kiện (kg)": 180,
                    "Màu sắc (Hex)": "#16a34a",
                    "Xếp chồng (1=Có, 0=Không)": 0,
                    "Khóa xoay (1=Khóa, 0=Tự do)": 1,
                    "Điểm dỡ hàng (Stop)": "Stop 1",
                    "Độ ưu tiên (1-5)": 1
                }
            ];

            const ws = XLSX.utils.json_to_sheet(sampleData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Mau_Hang_Hoa_TNG");
            XLSX.writeFile(wb, "TNG_CBM_Cargo_Template.xlsx");
        });
    }

    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', () => {
            if (typeof XLSX === 'undefined') return;
            const cargoItems = getCargoData(true);
            const exportRows = cargoItems.map((item, idx) => {
                const w = item.width || 50;
                const l = item.length || 60;
                const h = item.height || 40;
                const q = item.qty || 1;
                const rawWt = parseFloat(item.weight);
                const wt = isNaN(rawWt) ? 0 : Math.max(0, rawWt);
                return {
                    "STT": idx + 1,
                    "Tên hàng hóa": item.name,
                    "Dài (cm)": l,
                    "Rộng (cm)": w,
                    "Cao (cm)": h,
                    "Số lượng": q,
                    "Đơn trọng (kg)": wt,
                    "Tổng trọng lượng (kg)": wt * q,
                    "Thể tích CBM (m³)": ((w * l * h * q) / 1000000).toFixed(3),
                    "Xếp chồng (1=Có, 0=Không)": item.stackable === false ? 0 : 1,
                    "Chỉ đặt sàn (1=Có, 0=Không)": item.floorOnly === true ? 1 : 0,
                    "Vị trí ưu tiên": item.position || 'normal',
                    "Điểm dỡ hàng": item.stop || 'Stop 1',
                    "Màu sắc": item.color || '#dc2626'
                };
            });

            const ws = XLSX.utils.json_to_sheet(exportRows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Danh_Sach_Hang_Hoa");
            XLSX.writeFile(wb, `TNG_CBM_Cargo_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
        });
    }

    if (btnModalExport) {
        btnModalExport.addEventListener('click', () => {
            if (btnExportExcel) btnExportExcel.click();
        });
    }

    if (btnImportExcel && excelFileInput) {
        btnImportExcel.addEventListener('click', () => {
            excelFileInput.click();
        });

        excelFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const data = new Uint8Array(evt.target.result);
                    let workbook;
                    if (file.name.toLowerCase().endsWith('.csv')) {
                        const csvText = new TextDecoder('utf-8').decode(data).replace(/^\uFEFF/, '');
                        workbook = XLSX.read(csvText, { type: 'string' });
                    } else {
                        workbook = XLSX.read(data, { type: 'array' });
                    }
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const rows = XLSX.utils.sheet_to_json(worksheet);

                    if (rows && rows.length > 0) {
                        // Clear existing cards
                        const existingCards = cargoCardsContainer.querySelectorAll('.cargo-card');
                        for (let i = 1; i < existingCards.length; i++) {
                            existingCards[i].remove();
                        }

                        rows.forEach((r, idx) => {
                            let card;
                            if (idx === 0) {
                                card = cargoCardsContainer.querySelector('.cargo-card');
                            } else {
                                const firstCard = cargoCardsContainer.querySelector('.cargo-card');
                                duplicateCargoCard(firstCard, true);
                                const allCards = cargoCardsContainer.querySelectorAll('.cargo-card');
                                card = allCards[allCards.length - 1];
                            }

                            // Extract values supporting various header names & auto-converting (in)/(mm) Excel headers to cm
                            const name = r['Tên hàng hóa'] || r['Tên kiện hàng (Item Name)'] || r['Tên hàng'] || r['Name'] || r['Item'] || `Kiện hàng ${idx + 1}`;
                            const isInchRow = (r['Dài (in)'] !== undefined || r['Length (in)'] !== undefined || r['Dài (inch)'] !== undefined);
                            const isMmRow = (r['Dài (mm)'] !== undefined || r['Length (mm)'] !== undefined);
                            const srcScale = isInchRow ? 2.54 : (isMmRow ? 0.1 : 1);
                            const rawL = parseFloat(r['Dài (cm)'] ?? r['Dài (in)'] ?? r['Dài (inch)'] ?? r['Dài (mm)'] ?? r['Dài'] ?? r['Length (in)'] ?? r['Length (mm)'] ?? r['Length'] ?? r['L']) || 60;
                            const rawW = parseFloat(r['Rộng (cm)'] ?? r['Rộng (in)'] ?? r['Rộng (inch)'] ?? r['Rộng (mm)'] ?? r['Rộng'] ?? r['Width (in)'] ?? r['Width (mm)'] ?? r['Width'] ?? r['W']) || 50;
                            const rawH = parseFloat(r['Cao (cm)'] ?? r['Cao (in)'] ?? r['Cao (inch)'] ?? r['Cao (mm)'] ?? r['Cao'] ?? r['Height (in)'] ?? r['Height (mm)'] ?? r['Height'] ?? r['H']) || 40;
                            const l = rawL * srcScale;
                            const w = rawW * srcScale;
                            const h = rawH * srcScale;
                            const q = parseInt(r['Số lượng (Qty)'] ?? r['Số lượng'] ?? r['Quantity'] ?? r['Qty']) || 1;
                            const rawWt = r['Đơn trọng (kg)'] ?? r['Trọng lượng mỗi kiện (kg)'] ?? r['Khối lượng (kg)'] ?? r['Trọng lượng'] ?? r['Weight'] ?? r['Unit Wt (kg)'];
                            const parsedWt = (rawWt !== undefined && rawWt !== null && String(rawWt).trim() !== '') ? parseFloat(rawWt) : 0;
                            const wt = isNaN(parsedWt) ? 0 : Math.max(0, parsedWt);

                            const rawCol = r['Màu sắc (Hex)'] ?? r['Màu sắc'] ?? r['Color'] ?? '';
                            const colStr = String(rawCol).trim();
                            const hexColor = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(colStr)
                                ? colStr
                                : defaultColors[idx % defaultColors.length];

                            const rawStop = r['Điểm dỡ hàng'] ?? r['Điểm dỡ hàng (Stop)'] ?? r['Stop'];
                            const stopVal = (rawStop !== undefined && rawStop !== null && String(rawStop).trim() !== '')
                                ? String(rawStop).trim()
                                : 'Stop 1';

                            const rawStack = r['Xếp chồng (1=Có, 0=Không)'] ?? r['Xếp chồng'] ?? r['Cho đè lên'];
                            const hasStackCol = (rawStack !== undefined && rawStack !== null && String(rawStack).trim() !== '');
                            const stackVal = hasStackCol ? !(String(rawStack).trim() === '0' || String(rawStack).trim().toLowerCase() === 'false') : true;

                            const rawFloor = r['Chỉ đặt sàn (1=Có, 0=Không)'] ?? r['Chỉ đặt sàn'];
                            const hasFloorCol = (rawFloor !== undefined && rawFloor !== null && String(rawFloor).trim() !== '');
                            const floorVal = hasFloorCol ? (String(rawFloor).trim() === '1' || String(rawFloor).trim().toLowerCase() === 'true') : false;

                            const rawPos = r['Vị trí ưu tiên'] ?? r['Position'] ?? '';
                            const posStr = String(rawPos).trim().toLowerCase();
                            const posVal = (posStr === 'rear' || posStr === 'door') ? posStr : 'normal';

                            const rawRot = r['Khóa xoay (1=Khóa, 0=Tự do)'];
                            const hasRotCol = (rawRot !== undefined && rawRot !== null && String(rawRot).trim() !== '');
                            const rotVal = hasRotCol
                                ? ((String(rawRot).trim() === '1' || String(rawRot).trim().toLowerCase() === 'true') ? 'locked' : 'fit')
                                : null;

                            if (card) {
                                card.querySelector('.cargo-name').value = name;
                                card.querySelector('.cargo-length').value = fromCm(l, currentDimUnit);
                                card.querySelector('.cargo-width').value = fromCm(w, currentDimUnit);
                                card.querySelector('.cargo-height').value = fromCm(h, currentDimUnit);
                                card.querySelector('.cargo-qty').value = q;
                                card.querySelector('.cargo-weight').value = wt;
                                card.dataset.stop = stopVal;

                                const incCb = card.querySelector('.cargo-include');
                                if (incCb) incCb.checked = true;
                                card.classList.remove('cargo-excluded');

                                const colPicker = card.querySelector('.color-picker');
                                if (colPicker) colPicker.value = hexColor;

                                const stackCb = card.querySelector('.cargo-stackable') || card.querySelector('.checkbox-pill input');
                                const stackPill = card.querySelector('.stack-pill') || card.querySelector('.checkbox-pill');
                                if (stackCb) stackCb.checked = stackVal;
                                if (stackPill) stackPill.classList.toggle('active', stackVal);

                                const floorCb = card.querySelector('.cargo-floor-only');
                                const floorPill = card.querySelector('.floor-pill');
                                if (floorCb) floorCb.checked = floorVal;
                                if (floorPill) floorPill.classList.toggle('active', floorVal);

                                const posSel = card.querySelector('.cargo-position');
                                if (posSel) posSel.value = posVal;

                                const rotSel = card.querySelector('.cargo-rotation');
                                if (rotSel && rotVal) rotSel.value = rotVal;

                                const cWtSpan = card.querySelector('[id^="totalWeight"]');
                                const cVolSpan = card.querySelector('[id^="totalVol"]');
                                if (cWtSpan) cWtSpan.textContent = (wt * q).toLocaleString('en-US', { maximumFractionDigits: 1 });
                                if (cVolSpan) cVolSpan.textContent = ((w * l * h * q) / 1000000).toFixed(3);
                            }
                        });

                        lastSmartFleetPlans = [];
                        activeContainers = [selectedEquipment || '40hc'];
                        updateOverallSummary();
                        syncCardsToTable();
                        evaluateBestFitAndSync();
                        showToast(`Đã nhập thành công ${rows.length} loại hàng hóa từ file Excel!`);
                    } else {
                        showToast('Không tìm thấy dữ liệu hàng hóa trong file đã chọn!', true);
                    }
                } catch (err) {
                    console.error('Error importing Excel:', err);
                    showToast('Lỗi đọc file Excel: ' + err.message, true);
                } finally {
                    excelFileInput.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        });
    }

    // 10. Step-by-Step 3D Playback Sequence Controls
    const btnPlayPause = document.getElementById('btnPlayPause');
    const playPauseIcon = document.getElementById('playPauseIcon');
    const btnStepFirst = document.getElementById('btnStepFirst');
    const btnStepPrev = document.getElementById('btnStepPrev');
    const btnStepNext = document.getElementById('btnStepNext');
    const btnStepLast = document.getElementById('btnStepLast');
    const playbackSlider = document.getElementById('playbackSlider');
    const playbackCurrentStep = document.getElementById('playbackCurrentStep');
    const playbackTotalSteps = document.getElementById('playbackTotalSteps');
    const playbackCargoName = document.getElementById('playbackCargoName');
    const speedButtons = document.querySelectorAll('.playback-speed .speed-btn');

    const fmtCm = (m) => parseFloat((m * 100).toFixed(2));

    if (simulation) {
        simulation.onStepChange = (current, total, currentItem) => {
            if (playbackCurrentStep) playbackCurrentStep.textContent = current;
            if (playbackTotalSteps) playbackTotalSteps.textContent = total;
            if (playbackSlider) {
                playbackSlider.max = total;
                playbackSlider.value = current;
            }
            if (playPauseIcon) {
                playPauseIcon.className = simulation.isPlaying ? 'fas fa-pause' : 'fas fa-play';
            }
            if (playbackCargoName) {
                if (currentItem) {
                    const l_cm = fmtCm(currentItem.l);
                    const w_cm = fmtCm(currentItem.w);
                    const h_cm = fmtCm(currentItem.h);
                    playbackCargoName.textContent = `Đang xếp #${current}: ${currentItem.name} (${l_cm}×${w_cm}×${h_cm}cm, ${currentItem.weight}kg)`;
                } else if (current === 0) {
                    playbackCargoName.textContent = 'Container trống • Bắt đầu xếp hàng';
                } else {
                    playbackCargoName.textContent = 'Đã hoàn tất xếp hàng vào Container!';
                }
            }
        };

        // 3D Box Raycast Inspector Callback
        const boxInspectorCard = document.getElementById('boxInspectorCard');
        const inspStep = document.getElementById('inspStep');
        const inspName = document.getElementById('inspName');
        const inspDims = document.getElementById('inspDims');
        const inspWeight = document.getElementById('inspWeight');
        const inspPos = document.getElementById('inspPos');
        const inspRule = document.getElementById('inspRule');
        const btnCloseInspector = document.getElementById('btnCloseInspector');

        simulation.onBoxSelect = (boxData) => {
            if (!boxInspectorCard) return;
            if (boxData) {
                const l_cm = fmtCm(boxData.l);
                const w_cm = fmtCm(boxData.w);
                const h_cm = fmtCm(boxData.h);
                if (inspStep) inspStep.textContent = `#${boxData.step}`;
                if (inspName) inspName.textContent = boxData.name;
                if (inspDims) inspDims.textContent = `${l_cm} × ${w_cm} × ${h_cm} cm`;
                if (inspWeight) inspWeight.textContent = `${boxData.weight} kg`;
                if (inspPos) inspPos.textContent = `X: ${boxData.x.toFixed(2)}m, Y: ${boxData.y.toFixed(2)}m, Z: ${boxData.z.toFixed(2)}m`;
                if (inspRule) inspRule.textContent = `Thứ tự bốc #${boxData.step}`;
                boxInspectorCard.style.display = 'block';
            } else {
                boxInspectorCard.style.display = 'none';
            }
        };

        if (btnCloseInspector) {
            btnCloseInspector.addEventListener('click', () => {
                simulation.deselectBox();
            });
        }
    }

    if (btnPlayPause) {
        btnPlayPause.addEventListener('click', () => {
            if (!simulation) return;
            simulation.togglePlay();
            if (playPauseIcon) {
                playPauseIcon.className = simulation.isPlaying ? 'fas fa-pause' : 'fas fa-play';
            }
        });
    }

    if (btnStepFirst && simulation) {
        btnStepFirst.addEventListener('click', () => {
            simulation.pause();
            simulation.setPlaybackStep(0);
        });
    }

    if (btnStepPrev && simulation) {
        btnStepPrev.addEventListener('click', () => {
            simulation.pause();
            simulation.setPlaybackStep(simulation.currentStep - 1);
        });
    }

    if (btnStepNext && simulation) {
        btnStepNext.addEventListener('click', () => {
            simulation.pause();
            simulation.setPlaybackStep(simulation.currentStep + 1);
        });
    }

    if (btnStepLast && simulation) {
        btnStepLast.addEventListener('click', () => {
            simulation.pause();
            simulation.setPlaybackStep(simulation.totalSteps);
        });
    }

    if (playbackSlider && simulation) {
        playbackSlider.addEventListener('input', () => {
            simulation.pause();
            simulation.setPlaybackStep(parseInt(playbackSlider.value));
        });
    }

    speedButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            speedButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const spd = parseFloat(btn.getAttribute('data-speed')) || 1;
            if (simulation) simulation.setPlaySpeed(spd);
        });
    });

    // 11. CoG 3D Marker Toggle Button
    const btnToggleCog = document.getElementById('btnToggleCog');
    if (btnToggleCog && simulation) {
        btnToggleCog.addEventListener('click', () => {
            const isVisible = simulation.toggleCog();
            btnToggleCog.classList.toggle('active', isVisible);
        });
    }

    // Algorithm Radio Buttons Change Listener
    document.querySelectorAll('input[name="algorithm"]').forEach(radio => {
        radio.addEventListener('change', () => {
            triggerLiveSimulation();
        });
    });

    // Initial Best Fit Evaluation & 3D Packing on startup
    setTimeout(() => {
        evaluateBestFitAndSync();
    }, 400);

    // 12. View Controls (Operational, Realistic, X-Ray)
    const simViewButtons = document.querySelectorAll('[data-view-mode]');
    simViewButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            simViewButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const mode = btn.getAttribute('data-view-mode');
            if (simulation) {
                simulation.setViewMode(mode);
            }
        });
    });

    // 13. Camera Controls (Isometric, Door, Top, Side, Reset)
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

    // 14. Height Section Slider
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

    // 15. Fullscreen Toggle
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn && simulation) {
        fullscreenBtn.addEventListener('click', () => {
            simulation.toggleFullscreen();
        });
    }

    // 16. Multi-Item CBM Calculator (Metric/Imperial, W/M, Container Comparison)
    let cbmUnitMode = 'metric'; // 'metric' (cm, kg, m3) or 'imperial' (in, lbs, cft)
    const cbmTableBody = document.getElementById('cbmTableBody');
    const btnAddCbmRow = document.getElementById('btnAddCbmRow');
    const btnSyncCbmToSim = document.getElementById('btnSyncCbmToSim');
    const cbmUnitButtons = document.querySelectorAll('.cbm-unit-toggle .unit-btn');

    function calculateCbmTable() {
        if (!cbmTableBody) return;
        const rows = cbmTableBody.querySelectorAll('tr');
        let grandTotalCbm = 0;
        let grandTotalWeightKg = 0;

        rows.forEach((row, idx) => {
            row.cells[0].textContent = (idx + 1).toString();
            const l = parseFloat(row.querySelector('.cbm-row-l')?.value) || 0;
            const w = parseFloat(row.querySelector('.cbm-row-w')?.value) || 0;
            const h = parseFloat(row.querySelector('.cbm-row-h')?.value) || 0;
            const q = parseInt(row.querySelector('.cbm-row-q')?.value) || 0;
            const wt = parseFloat(row.querySelector('.cbm-row-wt')?.value) || 0;

            let unitCbm = 0;
            let totalCbm = 0;
            let totalWtKg = 0;

            if (cbmUnitMode === 'metric') {
                unitCbm = (l * w * h) / 1000000;
                totalCbm = unitCbm * q;
                totalWtKg = wt * q;
                row.querySelector('.cbm-unit-val').textContent = `${unitCbm.toFixed(3)} m³`;
                row.querySelector('.cbm-total-val').textContent = `${totalCbm.toFixed(3)} m³`;
                row.querySelector('.cbm-total-wt').textContent = `${totalWtKg.toLocaleString()} kg`;
            } else {
                // Imperial: L, W, H in inches; wt in lbs
                const unitCft = (l * w * h) / 1728;
                const totalCft = unitCft * q;
                unitCbm = unitCft / 35.3147;
                totalCbm = totalCft / 35.3147;
                totalWtKg = (wt * q) * 0.453592;
                row.querySelector('.cbm-unit-val').textContent = `${unitCft.toFixed(2)} CFT`;
                row.querySelector('.cbm-total-val').textContent = `${totalCft.toFixed(2)} CFT`;
                row.querySelector('.cbm-total-wt').textContent = `${(wt * q).toLocaleString()} lbs`;
            }

            grandTotalCbm += totalCbm;
            grandTotalWeightKg += totalWtKg;
        });

        // Update Summary Cards
        const totalCft = grandTotalCbm * 35.3147;
        const totalLbs = grandTotalWeightKg * 2.20462;
        const freightTon = Math.max(grandTotalCbm, grandTotalWeightKg / 1000);
        const airWeight = (grandTotalCbm * 1000000) / 6000;

        const elCbm = document.getElementById('cbmTotalVolume');
        const elCft = document.getElementById('cbmTotalCft');
        const elGross = document.getElementById('cbmTotalGross');
        const elLbs = document.getElementById('cbmTotalLbs');
        const elFt = document.getElementById('cbmFreightTon');
        const elAir = document.getElementById('cbmAirWeight');

        if (elCbm) elCbm.textContent = `${grandTotalCbm.toFixed(3)} m³`;
        if (elCft) elCft.textContent = `${totalCft.toFixed(2)} CFT`;
        if (elGross) elGross.textContent = `${grandTotalWeightKg.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`;
        if (elLbs) elLbs.textContent = `${totalLbs.toLocaleString('en-US', { maximumFractionDigits: 1 })} lbs`;
        if (elFt) elFt.textContent = `${freightTon.toFixed(2)} FT (W/M)`;
        if (elAir) elAir.textContent = `${airWeight.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`;

        // Update Container Comparison Bars
        const updateBar = (barId, statId, maxVol, maxPayload, name) => {
            const bar = document.getElementById(barId);
            const stat = document.getElementById(statId);
            if (!bar || !stat) return;
            const pctVol = Math.min(100, (grandTotalCbm / maxVol) * 100);
            const pctWt = Math.min(100, (grandTotalWeightKg / maxPayload) * 100);
            const pct = Math.max(pctVol, pctWt);
            bar.style.width = `${pct.toFixed(1)}%`;
            if (pct > 100) {
                bar.style.background = '#dc2626';
                stat.innerHTML = `<span style="color:#dc2626;font-weight:700;">Vượt tải cont (${pctVol.toFixed(1)}% thể tích, ${pctWt.toFixed(1)}% tải trọng)</span>`;
            } else {
                bar.style.background = 'var(--teal)';
                stat.innerHTML = `Chiếm ~<strong>${pctVol.toFixed(1)}%</strong> thể tích, <strong>${pctWt.toFixed(1)}%</strong> tải trọng`;
            }
        };

        updateBar('bar20dc', 'stat20dc', 33.2, 28200, "20DC");
        updateBar('bar40dc', 'stat40dc', 67.7, 26680, "40DC");
        updateBar('bar40hc', 'stat40hc', 76.3, 26460, "40HC");
        updateBar('bar45hc', 'stat45hc', 86.0, 27800, "45HC");
    }

    if (cbmTableBody) {
        cbmTableBody.addEventListener('input', calculateCbmTable);
        cbmTableBody.addEventListener('click', (e) => {
            const delBtn = e.target.closest('.btn-del-cbm-row');
            if (delBtn) {
                const trs = cbmTableBody.querySelectorAll('tr');
                if (trs.length > 1) {
                    delBtn.closest('tr').remove();
                    calculateCbmTable();
                } else {
                    alert('Cần ít nhất một dòng trong bảng!');
                }
            }
        });
    }

    if (btnAddCbmRow && cbmTableBody) {
        btnAddCbmRow.addEventListener('click', () => {
            const tr = document.createElement('tr');
            const count = cbmTableBody.querySelectorAll('tr').length + 1;
            tr.innerHTML = `
                <td>${count}</td>
                <td><input type="text" class="cbm-row-name" value="Kiện hàng ${count}"></td>
                <td><input type="number" class="cbm-row-l" value="60" min="1"></td>
                <td><input type="number" class="cbm-row-w" value="50" min="1"></td>
                <td><input type="number" class="cbm-row-h" value="40" min="1"></td>
                <td><input type="number" class="cbm-row-q" value="20" min="1"></td>
                <td><input type="number" class="cbm-row-wt" value="12" min="0"></td>
                <td class="cbm-unit-val">0.120 m³</td>
                <td class="cbm-total-val">2.400 m³</td>
                <td class="cbm-total-wt">240 kg</td>
                <td><button class="btn-del-cbm-row"><i class="fas fa-times"></i></button></td>
            `;
            cbmTableBody.appendChild(tr);
            calculateCbmTable();
        });
    }

    cbmUnitButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            cbmUnitButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            cbmUnitMode = btn.getAttribute('data-unit');

            const thDimL = document.getElementById('thDimL');
            const thDimW = document.getElementById('thDimW');
            const thDimH = document.getElementById('thDimH');
            const thDimWt = document.getElementById('thDimWt');

            if (cbmUnitMode === 'imperial') {
                if (thDimL) thDimL.textContent = 'Dài (in)';
                if (thDimW) thDimW.textContent = 'Rộng (in)';
                if (thDimH) thDimH.textContent = 'Cao (in)';
                if (thDimWt) thDimWt.textContent = 'Đơn trọng (lbs)';
            } else {
                if (thDimL) thDimL.textContent = 'Dài (cm)';
                if (thDimW) thDimW.textContent = 'Rộng (cm)';
                if (thDimH) thDimH.textContent = 'Cao (cm)';
                if (thDimWt) thDimWt.textContent = 'Đơn trọng (kg)';
            }
            calculateCbmTable();
        });
    });

    if (btnSyncCbmToSim && cbmTableBody) {
        btnSyncCbmToSim.addEventListener('click', () => {
            const rows = cbmTableBody.querySelectorAll('tr');
            if (rows.length === 0) return;

            // Clear existing cards
            const existingCards = cargoCardsContainer.querySelectorAll('.cargo-card');
            for (let i = 1; i < existingCards.length; i++) {
                existingCards[i].remove();
            }

            rows.forEach((row, idx) => {
                let card;
                if (idx === 0) {
                    card = cargoCardsContainer.querySelector('.cargo-card');
                } else {
                    const firstCard = cargoCardsContainer.querySelector('.cargo-card');
                    duplicateCargoCard(firstCard);
                    const allCards = cargoCardsContainer.querySelectorAll('.cargo-card');
                    card = allCards[allCards.length - 1];
                }

                const name = row.querySelector('.cbm-row-name')?.value || `Hàng hóa ${idx + 1}`;
                let l = parseFloat(row.querySelector('.cbm-row-l')?.value) || 60;
                let w = parseFloat(row.querySelector('.cbm-row-w')?.value) || 50;
                let h = parseFloat(row.querySelector('.cbm-row-h')?.value) || 40;
                let q = parseInt(row.querySelector('.cbm-row-q')?.value) || 1;
                let wt = parseFloat(row.querySelector('.cbm-row-wt')?.value) || 10;

                // If imperial, convert inches to cm and lbs to kg for 3D simulator
                if (cbmUnitMode === 'imperial') {
                    l = Math.round(l * 2.54);
                    w = Math.round(w * 2.54);
                    h = Math.round(h * 2.54);
                    wt = Math.round(wt * 0.453592 * 10) / 10;
                }

                if (card) {
                    card.querySelector('.cargo-name').value = name;
                    card.querySelector('.cargo-length').value = l;
                    card.querySelector('.cargo-width').value = w;
                    card.querySelector('.cargo-height').value = h;
                    card.querySelector('.cargo-qty').value = q;
                    card.querySelector('.cargo-weight').value = wt;
                }
            });

            updateOverallSummary();
            evaluateBestFitAndSync();
            syncCardsToTable();

            // Switch to Load Planner tab
            const plannerTab = document.querySelector('[data-tab="load-planner"]');
            if (plannerTab) plannerTab.click();
            run3DLoadPlan();
        });
    }

    calculateCbmTable();

    // 17. Mobile Menu Toggle
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

    // 18. Listen to language changes to update dynamic text
    window.addEventListener('languageChanged', (e) => {
        const lang = e.detail.lang;
        if (heightLabel && !heightToggle?.checked) {
            heightLabel.textContent = lang === 'vi' ? 'Toàn bộ' : 'Full view';
        }
        evaluateBestFitAndSync();
    });
});
