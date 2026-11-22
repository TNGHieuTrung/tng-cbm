// ===== Main Application Controller for CBM3 (Intelligent Best Fit & Live 3D Simulation) =====
document.addEventListener('DOMContentLoaded', () => {

    let liveSimTimeout = null;

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
            label: "20' Dry Container (20DC)",
            maxVol: 33.2,
            usableVol: 28.5,
            maxL: 5.898,
            maxW: 2.352,
            maxH: 2.393
        },
        '40dc': {
            dimStr: '12.032m × 2.352m × 2.393m',
            payload: '26,680 kg',
            label: "40' Dry Container (40DC)",
            maxVol: 67.7,
            usableVol: 59.0,
            maxL: 12.032,
            maxW: 2.352,
            maxH: 2.393
        },
        '40hc': {
            dimStr: '12.032m × 2.352m × 2.698m',
            payload: '26,460 kg',
            label: "40' High Cube (40HC)",
            maxVol: 76.3,
            usableVol: 68.5,
            maxL: 12.032,
            maxW: 2.352,
            maxH: 2.698
        },
        'truck': {
            dimStr: '13.600m × 2.480m × 2.700m',
            payload: '24,000 kg',
            label: 'Xe tải / Truck (13.6m)',
            maxVol: 86.0,
            usableVol: 78.0,
            maxL: 13.600,
            maxW: 2.480,
            maxH: 2.700
        },
        'custom': {
            dimStr: '6.000m × 2.400m × 2.400m',
            payload: '20,000 kg',
            label: 'Tùy chỉnh / Custom Space',
            maxVol: 34.5,
            usableVol: 30.0,
            maxL: 6.000,
            maxW: 2.400,
            maxH: 2.400
        }
    };

    let selectedEquipment = '20dc';

    const eqButtons = document.querySelectorAll('.equipment-btn');
    const eqDimDisplay = document.getElementById('eqDimDisplay');
    const eqPayloadDisplay = document.getElementById('eqPayload');
    const simEquipmentLabel = document.getElementById('simEquipmentLabel');
    const autoFitToggle = document.getElementById('autoFitToggle');
    const bestFitBanner = document.getElementById('bestFitBanner');
    const bestFitMsg = document.getElementById('bestFitMsg');
    const btnApplyFit = document.getElementById('btnApplyFit');

    function selectEquipment(eqKey, isManual = false) {
        if (!equipmentData[eqKey]) return;

        if (isManual && autoFitToggle && autoFitToggle.checked) {
            // User manually clicks an equipment -> switch auto-fit toggle off or keep notice
            autoFitToggle.checked = false;
        }

        selectedEquipment = eqKey;

        eqButtons.forEach(b => {
            if (b.getAttribute('data-equipment') === eqKey) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });

        const data = equipmentData[eqKey];
        if (eqDimDisplay) eqDimDisplay.textContent = data.dimStr;
        if (eqPayloadDisplay) eqPayloadDisplay.textContent = data.payload;
        if (simEquipmentLabel) simEquipmentLabel.textContent = data.label;

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
            evaluateBestFitAndSync();
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
                if (radio) {
                    radio.checked = true;
                    evaluateBestFitAndSync();
                }
            });
        });

        const checkPill = card.querySelector('.checkbox-pill');
        if (checkPill) {
            checkPill.addEventListener('click', () => {
                const cb = checkPill.querySelector('input');
                if (cb) {
                    cb.checked = !cb.checked;
                    checkPill.classList.toggle('active', cb.checked);
                    evaluateBestFitAndSync();
                }
            });
        }

        // Color picker
        const colorPicker = card.querySelector('.color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('input', () => {
                triggerLiveSimulation();
            });
        }

        // Rotation lock buttons
        const rotButtons = card.querySelectorAll('.rot-btn');
        rotButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                rotButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
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

        cargoCardsContainer.appendChild(clone);
        setupCargoCardListeners(clone);
        updateOverallSummary();
        evaluateBestFitAndSync();
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
            const name = card.querySelector('.cargo-name')?.value || `Hàng hóa ${idx + 1}`;
            const w = parseFloat(card.querySelector('.cargo-width')?.value) || 50;
            const l = parseFloat(card.querySelector('.cargo-length')?.value) || 60;
            const h = parseFloat(card.querySelector('.cargo-height')?.value) || 40;
            const qty = parseInt(card.querySelector('.cargo-qty')?.value) || 1;
            const wt = parseFloat(card.querySelector('.cargo-weight')?.value) || 10;
            const color = card.querySelector('.color-picker')?.value || '#dc2626';
            const stackChecked = card.querySelector('.checkbox-pill input')?.checked !== false;

            const totalWt = (wt * qty).toLocaleString('en-US', { maximumFractionDigits: 1 });
            const totalCbm = ((w * l * h * qty) / 1000000).toFixed(3);

            const tr = document.createElement('tr');
            tr.setAttribute('data-card-id', cardId);
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><input type="color" class="tbl-color" value="${color}"></td>
                <td><input type="text" class="tbl-name" value="${name}"></td>
                <td><input type="number" class="tbl-length" value="${l}" min="1"></td>
                <td><input type="number" class="tbl-width" value="${w}" min="1"></td>
                <td><input type="number" class="tbl-height" value="${h}" min="1"></td>
                <td><input type="number" class="tbl-qty" value="${qty}" min="1"></td>
                <td><input type="number" class="tbl-weight" value="${wt}" min="0" step="0.1"></td>
                <td class="tbl-tot-wt">${totalWt}</td>
                <td class="tbl-tot-cbm">${totalCbm}</td>
                <td style="text-align:center;"><input type="checkbox" class="tbl-stack" ${stackChecked ? 'checked' : ''}></td>
                <td>
                    <select class="tbl-stop">
                        <option value="Stop 1">Stop 1 (Sâu nhất)</option>
                        <option value="Stop 2">Stop 2</option>
                        <option value="Stop 3">Stop 3</option>
                        <option value="Stop 4">Stop 4</option>
                        <option value="Stop 5">Stop 5 (Cửa cont)</option>
                    </select>
                </td>
                <td>
                    <select class="tbl-priority">
                        <option value="1">1 (Cao nhất)</option>
                        <option value="2">2</option>
                        <option value="3" selected>3</option>
                    </select>
                </td>
                <td style="text-align:center;">
                    <button class="tbl-del-btn" title="Xóa dòng"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;

            // Row input listeners to sync back to corresponding card
            const bindRowInput = (sel, cardSel, isVal = true, isCheck = false) => {
                const inp = tr.querySelector(sel);
                if (!inp) return;
                inp.addEventListener('input', () => {
                    const cInp = card.querySelector(cardSel);
                    if (cInp) {
                        if (isCheck) {
                            cInp.checked = inp.checked;
                            const checkPill = card.querySelector('.checkbox-pill');
                            if (checkPill) checkPill.classList.toggle('active', inp.checked);
                        } else if (isVal) {
                            cInp.value = inp.value;
                        }
                    }
                    const wVal = parseFloat(tr.querySelector('.tbl-width').value) || 0;
                    const lVal = parseFloat(tr.querySelector('.tbl-length').value) || 0;
                    const hVal = parseFloat(tr.querySelector('.tbl-height').value) || 0;
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
            bindRowInput('.tbl-stack', '.checkbox-pill input', false, true);

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

            const typeRadio = card.querySelector('input[type="radio"]:checked');
            const type = typeRadio ? typeRadio.value : 'box';

            const stackCheckbox = card.querySelector('.checkbox-pill input');
            const stackable = stackCheckbox ? stackCheckbox.checked : true;

            const activeRotBtn = card.querySelector('.rot-btn.active');
            const rotation = activeRotBtn && activeRotBtn.title.includes('Khóa') ? 'locked' : 'horizontal';

            items.push({ name, width, length, height, qty, weight, color, type, stackable, rotation, stop: 'Stop 1' });
        });

        return items;
    }

    // 6. Intelligent Best Fit Recommendation Algorithm
    function evaluateBestFit(cargoItems) {
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
        if (maxL > 5.89 || maxW > 2.35 || totalVol > 28.5 || totalWt > 28200 || maxH > 2.38) {
            // Cannot fit in 20DC
            if (totalVol <= 59.0 && totalWt <= 26680 && maxH <= 2.38 && maxL <= 12.03) {
                recommended = '40dc';
                msg = lang === 'vi'
                    ? `Đề xuất tối ưu: <span class="fit-highlight">40' Dry Container (40DC)</span> — Thể tích hàng (${totalVol.toFixed(1)} m³) vượt quá cont 20ft (33.2 m³). Vừa vặn 100% trong cont 40DC!`
                    : `Optimal Recommendation: <span class="fit-highlight">40' Dry Container (40DC)</span> — Cargo volume (${totalVol.toFixed(1)} m³) exceeds 20ft container (33.2 m³). Fits 100% in 40DC!`;
            } else if (totalVol <= 68.5 && totalWt <= 26460 && maxL <= 12.03) {
                recommended = '40hc';
                msg = lang === 'vi'
                    ? `Đề xuất tối ưu: <span class="fit-highlight">40' High Cube (40HC)</span> — Chiều cao kiện hàng (${(maxH*100).toFixed(0)}cm) hoặc thể tích (${totalVol.toFixed(1)} m³) phù hợp nhất với cont 40' cao!`
                    : `Optimal Recommendation: <span class="fit-highlight">40' High Cube (40HC)</span> — Cargo height (${(maxH*100).toFixed(0)}cm) or volume (${totalVol.toFixed(1)} m³) is ideal for 40' High Cube!`;
            } else if (totalVol <= 78.0 && totalWt <= 24000) {
                recommended = 'truck';
                msg = lang === 'vi'
                    ? `Đề xuất tối ưu: <span class="fit-highlight">Xe tải đường bộ (Truck 13.6m)</span> — Khối tích lớn (${totalVol.toFixed(1)} m³), tối ưu cho phương tiện vận tải đường bộ.`
                    : `Optimal Recommendation: <span class="fit-highlight">Truck (13.6m)</span> — High cargo volume (${totalVol.toFixed(1)} m³), optimized for 13.6m road transport.`;
            } else {
                // Multi-container requirement
                numContainers = Math.ceil(Math.max(totalVol / 65, totalWt / 26000));
                recommended = '40hc';
                isOversized = true;
                msg = lang === 'vi'
                    ? `⚠️ Cảnh báo vượt tải: Lô hàng lớn (${totalVol.toFixed(1)} m³, ${totalWt.toLocaleString()} kg) vượt quá 1 container! Cần <span class="fit-highlight">${numContainers} container 40HC</span> để xếp hết.`
                    : `⚠️ Over-capacity Alert: Large shipment (${totalVol.toFixed(1)} m³, ${totalWt.toLocaleString()} kg) exceeds 1 container! Requires <span class="fit-highlight">${numContainers}x 40HC containers</span>.`;
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
        const bestInfo = evaluateBestFit(cargoItems);

        // Update Banner UI
        if (bestFitBanner && bestFitMsg) {
            bestFitMsg.innerHTML = bestInfo.msg;
            if (bestInfo.isOversized) {
                bestFitBanner.classList.add('warning');
            } else {
                bestFitBanner.classList.remove('warning');
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
            const result = simulation.packCargo(cargoItems, selectedAlgo);
            updateUIWithSimulationResult(result);
        }, 150);
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

        if (hudPlaced) hudPlaced.textContent = `${result.placed} / ${result.totalRequested}`;
        if (hudVol) hudVol.textContent = `${result.volume} m³ / ${result.containerVolume} m³`;
        if (hudWt) hudWt.textContent = `${result.weight} kg`;
        if (hudUtil) hudUtil.textContent = `${result.utilization}%`;
        if (hudCog) hudCog.textContent = result.cogStatus;

        if (result.unplaced > 0) {
            if (hudUnplacedRow) hudUnplacedRow.style.display = 'flex';
            if (hudUnplaced) hudUnplaced.textContent = `${result.unplaced} kiện (Cont đầy)`;
            if (hudStatusBadge) {
                hudStatusBadge.textContent = `Chưa xếp: ${result.unplaced} kiện`;
                hudStatusBadge.classList.add('warning');
            }
        } else {
            if (hudUnplacedRow) hudUnplacedRow.style.display = 'none';
            if (hudStatusBadge) {
                hudStatusBadge.textContent = '100% Vừa vặn';
                hudStatusBadge.classList.remove('warning');
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

        if (resPlaced) resPlaced.textContent = `${result.placed} / ${result.totalRequested} kiện`;
        if (result.unplaced > 0) {
            if (resUnplacedRow) resUnplacedRow.style.display = 'table-row';
            if (resUnplaced) resUnplaced.textContent = `${result.unplaced} kiện chưa vừa container!`;
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
        const data = equipmentData[selectedEquipment] || equipmentData['20dc'];

        let totalVol = 0;
        let totalWt = 0;
        let totalQty = 0;

        const tableBody = document.getElementById('modalManifestTableBody');
        if (tableBody) tableBody.innerHTML = '';

        cargoItems.forEach((item, idx) => {
            const w = item.width || 50;
            const l = item.length || 60;
            const h = item.height || 40;
            const q = item.qty || 1;
            const wt = item.weight || 10;

            const itemVol = (w * l * h * q) / 1000000;
            const itemWt = wt * q;

            totalVol += itemVol;
            totalWt += itemWt;
            totalQty += q;

            if (tableBody) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${idx + 1}</td>
                    <td><strong>${item.name}</strong></td>
                    <td>${l} × ${w} × ${h}</td>
                    <td>${q} / ${q}</td>
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
        const utilPercent = ((totalVol / data.maxVol) * 100).toFixed(1);

        const modalEquip = document.getElementById('modalEquipmentName');
        const modalCreated = document.getElementById('modalCreatedDate');
        const modalCbm = document.getElementById('modalTotalCbm');
        const modalCft = document.getElementById('modalTotalCft');
        const modalGross = document.getElementById('modalTotalWeight');
        const modalFt = document.getElementById('modalFreightTon');
        const modalAir = document.getElementById('modalAirVolWeight');
        const modalUtil = document.getElementById('modalUtilPercent');

        if (modalEquip) modalEquip.textContent = data.label;
        if (modalCreated) modalCreated.textContent = new Date().toLocaleDateString('vi-VN');
        if (modalCbm) modalCbm.textContent = `${totalVol.toFixed(3)} m³`;
        if (modalCft) modalCft.textContent = `${totalCft} CFT`;
        if (modalGross) modalGross.textContent = `${totalWt.toLocaleString('en-US', { maximumFractionDigits: 1 })} kg`;
        if (modalFt) modalFt.textContent = `${freightTon} FT`;
        if (modalAir) modalAir.textContent = `${airVolWeight.toLocaleString()} kg`;
        if (modalUtil) modalUtil.textContent = `${utilPercent}%`;

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
            window.print();
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
            const cargoItems = getCargoData();
            const exportRows = cargoItems.map((item, idx) => {
                const w = item.width || 50;
                const l = item.length || 60;
                const h = item.height || 40;
                const q = item.qty || 1;
                const wt = item.weight || 10;
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
                    const workbook = XLSX.read(data, { type: 'array' });
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
                                duplicateCargoCard(firstCard);
                                const allCards = cargoCardsContainer.querySelectorAll('.cargo-card');
                                card = allCards[allCards.length - 1];
                            }

                            // Extract values supporting various header names (Vietnamese & English)
                            const name = r['Tên hàng hóa'] || r['Tên kiện hàng (Item Name)'] || r['Tên hàng'] || r['Name'] || r['Item'] || `Kiện hàng ${idx + 1}`;
                            const l = r['Dài (cm)'] || r['Dài'] || r['Length'] || r['L'] || 60;
                            const w = r['Rộng (cm)'] || r['Rộng'] || r['Width'] || r['W'] || 50;
                            const h = r['Cao (cm)'] || r['Cao'] || r['Height'] || r['H'] || 40;
                            const q = r['Số lượng (Qty)'] || r['Số lượng'] || r['Quantity'] || r['Qty'] || 10;
                            const wt = r['Trọng lượng mỗi kiện (kg)'] || r['Khối lượng (kg)'] || r['Trọng lượng'] || r['Weight'] || 10;
                            const col = r['Màu sắc (Hex)'] || r['Màu sắc'] || r['Color'] || defaultColors[idx % defaultColors.length];

                            if (card) {
                                card.querySelector('.cargo-name').value = name;
                                card.querySelector('.cargo-length').value = l;
                                card.querySelector('.cargo-width').value = w;
                                card.querySelector('.cargo-height').value = h;
                                card.querySelector('.cargo-qty').value = q;
                                card.querySelector('.cargo-weight').value = wt;
                                const colPicker = card.querySelector('.color-picker');
                                if (colPicker) colPicker.value = col.startsWith('#') ? col : defaultColors[idx % defaultColors.length];
                            }
                        });

                        updateOverallSummary();
                        evaluateBestFitAndSync();
                        syncCardsToTable();
                        alert(`Đã nhập thành công ${rows.length} loại hàng hóa từ file Excel!`);
                    } else {
                        alert('Không tìm thấy dữ liệu hàng hóa trong file đã chọn!');
                    }
                } catch (err) {
                    console.error('Error importing Excel:', err);
                    alert('Lỗi đọc file Excel: ' + err.message);
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
                    const l_cm = Math.round(currentItem.l * 100);
                    const w_cm = Math.round(currentItem.w * 100);
                    const h_cm = Math.round(currentItem.h * 100);
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
                const l_cm = Math.round(boxData.l * 100);
                const w_cm = Math.round(boxData.w * 100);
                const h_cm = Math.round(boxData.h * 100);
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
        updateBar('barTruck', 'statTruck', 86.0, 24000, "Truck");
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
