// ===== Internationalization (i18n) System for CBM3 =====
const translations = {
    vi: {
        // Navigation
        'nav.title': 'Máy tính xếp hàng Container',
        'nav.home': 'Trang chủ',
        'nav.calculator': 'Máy tính xếp hàng',
        'nav.tools': 'Công cụ',
        'nav.guides': 'Hướng dẫn',
        'nav.contact': 'Liên hệ',

        // Hero
        'hero.vesselTag': 'Đội tàu vận tải biển TNG Global • Chuyến hàng quốc tế',
        'hero.badge': '🚢 Cổng thông tin Logistics TNG • Phụ trách: hieutrung@tng.vn',
        'hero.titlePrefix': 'TNG Logistics',
        'hero.title': 'Máy tính xếp hàng Container 3D',
        'hero.desc': 'Lên kế hoạch xếp hàng trước khi bốc dỡ cho đội tàu chở hàng TNG và hệ thống logistics đa phương thức. Mô phỏng 3D trực quan cho container biển, rơ moóc, xe tải và toa tàu.',
        'hero.quote': 'Hệ thống tự động tính toán thể tích CBM, tải trọng, vị trí trọng tâm và tối ưu hóa không gian chứa hàng trên từng chuyến tàu vận tải của TNG.',
        'hero.startBtn': '<i class="fas fa-cubes"></i> Bắt đầu xếp hàng 3D',
        'hero.caption': 'Đường biển, hàng không, đường bộ, đường sắt và không gian tùy chỉnh TNG.',
        'hero.previewLive': 'MÔ PHỎNG 3D THỜI GIAN THỰC',

        // Selector
        'selector.label': '— CHỌN MÁY TÍNH CỦA BẠN',
        'selector.planner.title': 'Máy tính xếp hàng Container & Mô phỏng 3D',
        'selector.planner.desc': 'Lên kế hoạch bốc hàng 3D cho container biển, xe tải, hàng không',
        'selector.cbm.title': 'Máy tính CBM',
        'selector.cbm.desc': 'Tính thể tích khối hàng hóa nhanh chóng',

        // App Toolbar & Config
        'app.guest': '👤 Phiên khách',
        'app.save': '<i class="fas fa-save"></i> Lưu',
        'app.load': '<i class="fas fa-folder-open"></i> Tải',
        'app.bestFit.tag': '🎯 TỰ ĐỘNG ĐỀ XUẤT THIẾT BỊ PHÙ HỢP NHẤT',
        'app.bestFit.autoMode': '⚡ Tự động chọn cont phù hợp (Best Fit)',
        'app.bestFit.badge': 'TỐI ƯU',
        'app.bestFit.applyBtn': 'Áp dụng',
        'app.equipment.title': 'Chọn thiết bị vận chuyển',
        'app.equipment.truck': 'Xe tải',
        'app.equipment.custom': 'Tùy chỉnh',
        'app.equipment.internal': 'Kích thước nội bộ:',
        'app.equipment.payload': 'Tải trọng tối đa:',

        // Cargo
        'app.cargo.title': 'Thẻ hàng hóa',
        'app.cargo.cards': 'Thẻ',
        'app.cargo.table': 'Bảng',
        'app.cargo.itemName': 'TÊN HÀNG HÓA',
        'app.cargo.namePlaceholder': 'Nhập tên hàng hóa...',
        'app.cargo.duplicate': 'Nhân bản',
        'app.cargo.preview': 'Xem trước',
        'app.cargo.delete': 'Xóa',
        'app.cargo.width': 'Rộng (cm)',
        'app.cargo.length': 'Dài (cm)',
        'app.cargo.height': 'Cao (cm)',
        'app.cargo.qty': 'Số lượng',
        'app.cargo.weight': 'Trọng lượng (kg)',
        'app.cargo.totalWeight': 'Tổng KL (kg)',
        'app.cargo.volume': 'Thể tích (m³)',
        'app.cargo.type': 'Loại',
        'app.cargo.box': 'Hộp',
        'app.cargo.cylinder': 'Trụ',
        'app.cargo.stackable': 'Xếp chồng',
        'app.cargo.color': 'Màu sắc',
        'app.cargo.rotation': 'Xoay',
        'app.cargo.rotFree': 'Chỉ ngang',
        'app.cargo.loadMethod': 'Phương pháp',
        'app.cargo.floorOnly': 'Chỉ xếp sàn',
        'app.cargo.stackFull': 'Xếp đầy',
        'app.cargo.addNew': 'Thêm hàng hóa mới',

        // Cargo Table View
        'app.table.addRow': 'Thêm dòng hàng hóa',
        'app.table.clearAll': 'Xóa tất cả',
        'app.table.color': 'Màu',
        'app.table.name': 'Tên hàng',
        'app.table.length': 'D (cm)',
        'app.table.width': 'R (cm)',
        'app.table.height': 'C (cm)',
        'app.table.qty': 'SL',
        'app.table.weight': 'KL (kg)',
        'app.table.totalWeight': 'Tổng KL',
        'app.table.cbm': 'CBM',
        'app.table.stackable': 'Chồng',
        'app.table.stop': 'Điểm dỡ',
        'app.table.priority': 'Ưu tiên',
        'app.table.actions': 'Xóa',

        // Summary
        'app.summary.totalVolume': 'Tổng thể tích (CBM)',
        'app.summary.totalWeight': 'Tổng trọng lượng',
        'app.summary.totalItems': 'Tổng kiện hàng',

        // Algorithms
        'app.algo.title': 'Thuật toán sắp xếp',
        'app.algo.bestBalance': 'Cân bằng tốt nhất',
        'app.algo.bestBalanceDesc': 'Mặc định - Tối ưu không gian và ổn định',
        'app.algo.maxVolume': 'Tối đa thể tích',
        'app.algo.maxVolumeDesc': 'Ưu tiên tận dụng không gian tối đa',
        'app.algo.easyLoad': 'Dễ bốc dỡ',
        'app.algo.easyLoadDesc': 'Ưu tiên thuận tiện bốc/dỡ hàng',
        'app.algo.stability': 'Ổn định trước',
        'app.algo.stabilityDesc': 'Ưu tiên tính ổn định của hàng hóa',

        // 3D Simulation
        'sim.title': 'Mô phỏng xếp hàng 3D',
        'sim.view': 'Chế độ xem',
        'sim.operational': 'Vận hành',
        'sim.realistic': 'Thực tế',
        'sim.xray': 'X-Ray',
        'sim.camera': 'Góc nhìn',
        'sim.isometric': 'Phối cảnh',
        'sim.door': 'Cửa',
        'sim.top': 'Trên',
        'sim.side': 'Bên',
        'sim.heightSection': 'Cắt lớp chiều cao',
        'sim.fullView': 'Toàn bộ',
        'sim.fullscreen': 'Toàn màn hình',
        'sim.toggleCog': '<i class="fas fa-crosshairs"></i> CoG',
        'sim.playback.step': 'Tiến trình xếp:',
        'sim.playback.speed': 'Tốc độ:',
        'sim.hud.placed': 'Đã xếp:',
        'sim.hud.unplaced': 'Chưa xếp:',
        'sim.hud.volume': 'Thể tích:',
        'sim.hud.weight': 'Khối lượng:',
        'sim.hud.utilization': 'Lấp đầy:',
        'sim.hud.cog': 'Trọng tâm:',
        'sim.loading': 'Đang tính toán bố trí xếp hàng...',
        'sim.note': 'Hình dạng bên ngoài thiết bị chỉ mang tính minh họa. Trong chế độ xem thực tế, các bức tường gần sẽ ẩn để hiển thị hàng hóa; kích thước và quy tắc xếp hàng không thay đổi.',
        'sim.result.placed': 'Kiện hàng đã xếp',
        'sim.result.unplaced': 'Kiện chưa xếp (vượt tải)',
        'sim.result.volume': 'Thể tích hàng hóa',
        'sim.result.capacity': 'Sức chứa Container',
        'sim.result.mass': 'Tổng khối lượng hàng',
        'sim.result.payload': 'Tải trọng tối đa cho phép',
        'sim.result.utilization': 'Tỉ lệ lấp đầy thể tích',
        'sim.result.cog': 'Đánh giá trọng tâm (CoG)',

        // CBM Calculator
        'cbm.title': 'Máy tính CBM (Thể tích khối & Trọng lượng tính cước)',
        'cbm.desc': 'Tính thể tích CBM, CFT, Trọng lượng tính cước (W/M) và ước lượng số kiện xếp vừa từng loại Container.',
        'cbm.col.name': 'Tên mặt hàng',
        'cbm.col.length': 'Dài (cm)',
        'cbm.col.width': 'Rộng (cm)',
        'cbm.col.height': 'Cao (cm)',
        'cbm.col.qty': 'Số lượng',
        'cbm.col.weight': 'Đơn trọng (kg)',
        'cbm.addRow': 'Thêm kiện hàng',
        'cbm.sendToSim': 'Chuyển sang Xếp hàng 3D',
        'cbm.metric.totalCbm': 'TỔNG THỂ TÍCH (CBM)',
        'cbm.metric.totalGross': 'TỔNG TRỌNG LƯỢNG (GROSS)',
        'cbm.metric.freightTon': 'TRỌNG LƯỢNG TÍNH CƯỚC (W/M)',
        'cbm.metric.airWeight': 'TL THỂ TÍCH HÀNG KHÔNG',
        'cbm.compare.title': 'Ước tính sức chứa trên các loại Container chuẩn',
        'cbm.width': 'Rộng (cm)',
        'cbm.length': 'Dài (cm)',
        'cbm.height': 'Cao (cm)',
        'cbm.qty': 'Số lượng',
        'cbm.calculate': '<i class="fas fa-calculator"></i> Tính CBM',
        'cbm.perUnit': 'CBM mỗi kiện',
        'cbm.total': 'Tổng CBM',

        // Tools
        'tools.tag': '🚛 Công cụ logistics miễn phí',
        'tools.title': 'Công cụ CBM, Vận tải & Xếp hàng Container',
        'tools.desc': 'CBM3 cung cấp các công cụ trực tuyến thiết thực cho đội ngũ logistics, nhà xuất nhập khẩu, và chuyên gia thương mại quốc tế.',
        'tools.t1.title': 'Máy tính xếp hàng 3D',
        'tools.t1.desc': 'Mô phỏng 3D xếp hàng container với nhiều thuật toán tối ưu',
        'tools.t2.title': 'Máy tính CBM',
        'tools.t2.desc': 'Tính thể tích khối hàng hóa nhanh chóng và chính xác',
        'tools.t3.title': 'Chuyển đổi đơn vị',
        'tools.t3.desc': 'Chuyển đổi giữa các đơn vị đo lường vận tải hàng hóa',
        'tools.t4.title': 'Tính phát thải CO₂',
        'tools.t4.desc': 'Ước tính lượng phát thải carbon từ vận chuyển hàng hóa',
        'tools.t5.title': 'Hướng dẫn Container biển',
        'tools.t5.desc': 'Kích thước và thông số kỹ thuật container ISO đầy đủ',
        'tools.t6.title': 'Hướng dẫn ULD hàng không',
        'tools.t6.desc': 'Thông số và kích thước đơn vị xếp hàng hàng không',
        'tools.startBtn': '<i class="fas fa-rocket"></i> Bắt đầu mô phỏng 3D',
        'tools.browseBtn': '<i class="fas fa-th-large"></i> Xem tất cả công cụ',

        // Guides
        'guides.title': 'Hướng dẫn thiết bị vận tải',
        'guides.desc': 'Thông số kỹ thuật chi tiết cho tất cả các loại phương tiện vận tải hàng hóa.',
        'guides.g1.title': 'Container biển',
        'guides.g1.desc': '20DC, 40DC, 40HC, 45HC, Open Top, Flat Rack',
        'guides.g2.title': 'Vận tải đường bộ',
        'guides.g2.desc': 'Xe tải, rơ moóc, xe đông lạnh, xe tải nhẹ',
        'guides.g3.title': 'Hàng không (ULD)',
        'guides.g3.desc': 'LD3, LD7, LD11, PMC, PAG pallet',
        'guides.g4.title': 'Vận tải đường sắt',
        'guides.g4.desc': 'Toa xe lửa, container liên vận châu Âu',

        // Footer
        'footer.about': 'Hệ thống tính toán tải trọng và mô phỏng xếp dỡ container 3D trực thuộc TNG Logistics. Tối ưu hóa năng lực vận chuyển hàng hải và chuỗi cung ứng toàn cầu.',
        'footer.legal': 'Pháp lý & Quy chuẩn',
        'footer.terms': 'Điều khoản sử dụng TNG',
        'footer.privacy': 'Chính sách bảo mật dữ liệu',
        'footer.disclaimer': 'Quy định an toàn xếp dỡ',
        'footer.contactTitle': 'Thông tin liên hệ TNG',
        'footer.aboutUs': 'Về chúng tôi',
        'footer.quickAccess': 'Truy cập nhanh',
        'footer.calculator3d': 'Mô phỏng xếp hàng 3D',
        'footer.allTools': 'Tất cả công cụ logistics',
        'footer.equipGuides': 'Thông số đội tàu & Container',

        // Sticky Bar
        'sticky.plan': 'Mô phỏng xếp hàng 3D',
        'sticky.summary': 'Tổng kết'
    },

    en: {
        // Navigation
        'nav.title': 'Container Loading Calculator',
        'nav.home': 'Home',
        'nav.calculator': 'Load Calculator',
        'nav.tools': 'Tools',
        'nav.guides': 'Guides',
        'nav.contact': 'Contact',

        // Hero
        'hero.vesselTag': 'TNG Global Container Fleet • International Shipping Lines',
        'hero.badge': '🚢 TNG Logistics Portal • Contact: hieutrung@tng.vn',
        'hero.titlePrefix': 'TNG Logistics',
        'hero.title': '3D Container Loading Calculator',
        'hero.desc': 'Pre-plan cargo loading before dispatching across TNG cargo vessel fleet and multimodal transport. Interactive 3D simulation for sea containers, trucks, trailers and rail wagons.',
        'hero.quote': 'Automatically compute CBM volume, axle loads, center of gravity and maximize cargo space utilization for TNG shipping voyages.',
        'hero.startBtn': '<i class="fas fa-cubes"></i> Start 3D Load Plan',
        'hero.caption': 'Sea, air, road, rail and custom cargo spaces across TNG fleet.',
        'hero.previewLive': 'LIVE 3D SIMULATION',

        // Selector
        'selector.label': '— CHOOSE YOUR CALCULATOR',
        'selector.planner.title': 'Container Loading Calculator & 3D Load Planner',
        'selector.planner.desc': '3D cargo loading planning for sea containers, trucks, air units',
        'selector.cbm.title': 'CBM Calculator',
        'selector.cbm.desc': 'Quick cubic volume cargo calculator',

        // App Toolbar & Config
        'app.guest': '👤 Guest Session',
        'app.save': '<i class="fas fa-save"></i> Save',
        'app.load': '<i class="fas fa-folder-open"></i> Load',
        'app.bestFit.tag': '🎯 AUTOMATIC BEST FIT EQUIPMENT RECOMMENDATION',
        'app.bestFit.autoMode': '⚡ Auto-Select Best Fit Container',
        'app.bestFit.badge': 'BEST FIT',
        'app.bestFit.applyBtn': 'Apply',
        'app.equipment.title': 'Select Transport Equipment',
        'app.equipment.truck': 'Truck',
        'app.equipment.custom': 'Custom',
        'app.equipment.internal': 'Internal Dimensions:',
        'app.equipment.payload': 'Max Payload:',

        // Cargo
        'app.cargo.title': 'Cargo Cards',
        'app.cargo.cards': 'Cards',
        'app.cargo.table': 'Table',
        'app.cargo.itemName': 'ITEM NAME',
        'app.cargo.namePlaceholder': 'Enter item name...',
        'app.cargo.duplicate': 'Duplicate',
        'app.cargo.preview': 'Preview',
        'app.cargo.delete': 'Delete',
        'app.cargo.width': 'Width (cm)',
        'app.cargo.length': 'Length (cm)',
        'app.cargo.height': 'Height (cm)',
        'app.cargo.qty': 'Quantity',
        'app.cargo.weight': 'Weight (kg)',
        'app.cargo.totalWeight': 'Total Wt (kg)',
        'app.cargo.volume': 'Volume (m³)',
        'app.cargo.type': 'Type',
        'app.cargo.box': 'Box',
        'app.cargo.cylinder': 'Cylinder',
        'app.cargo.stackable': 'Stackable',
        'app.cargo.color': 'Color',
        'app.cargo.rotation': 'Rotation',
        'app.cargo.rotFree': 'Horizontal Only',
        'app.cargo.loadMethod': 'Method',
        'app.cargo.floorOnly': 'Floor load only',
        'app.cargo.stackFull': 'Stack full',
        'app.cargo.addNew': 'Add New Cargo',

        // Cargo Table View
        'app.table.addRow': 'Add Cargo Row',
        'app.table.clearAll': 'Clear All',
        'app.table.color': 'Color',
        'app.table.name': 'Cargo Name',
        'app.table.length': 'L (cm)',
        'app.table.width': 'W (cm)',
        'app.table.height': 'H (cm)',
        'app.table.qty': 'Qty',
        'app.table.weight': 'Wt (kg)',
        'app.table.totalWeight': 'Total Wt',
        'app.table.cbm': 'CBM',
        'app.table.stackable': 'Stack',
        'app.table.stop': 'Stop',
        'app.table.priority': 'Priority',
        'app.table.actions': 'Del',

        // Summary
        'app.summary.totalVolume': 'Total Volume (CBM)',
        'app.summary.totalWeight': 'Total Weight',
        'app.summary.totalItems': 'Total Items',

        // Algorithms
        'app.algo.title': 'Loading Algorithm',
        'app.algo.bestBalance': 'Best Balance',
        'app.algo.bestBalanceDesc': 'Default - Space utilization & stability balance',
        'app.algo.maxVolume': 'Max Volume',
        'app.algo.maxVolumeDesc': 'Maximize container volume utilization',
        'app.algo.easyLoad': 'Easy Loading',
        'app.algo.easyLoadDesc': 'Prioritize easy loading & unloading access',
        'app.algo.stability': 'Stability First',
        'app.algo.stabilityDesc': 'Prioritize heavy cargo base & stability',

        // 3D Simulation
        'sim.title': '3D Loading Simulation',
        'sim.view': 'View Mode',
        'sim.operational': 'Operational',
        'sim.realistic': 'Realistic',
        'sim.xray': 'X-Ray',
        'sim.camera': 'Camera',
        'sim.isometric': 'Isometric',
        'sim.door': 'Door',
        'sim.top': 'Top',
        'sim.side': 'Side',
        'sim.heightSection': 'Height Section',
        'sim.fullView': 'Full view',
        'sim.fullscreen': 'Full Screen',
        'sim.toggleCog': '<i class="fas fa-crosshairs"></i> CoG',
        'sim.playback.step': 'Loading Step:',
        'sim.playback.speed': 'Speed:',
        'sim.hud.placed': 'Placed:',
        'sim.hud.unplaced': 'Unplaced:',
        'sim.hud.volume': 'Volume:',
        'sim.hud.weight': 'Weight:',
        'sim.hud.utilization': 'Space Fill:',
        'sim.hud.cog': 'CoG Balance:',
        'sim.loading': 'Computing 3D loading arrangement...',
        'sim.note': 'Equipment exteriors are illustrative. In realistic view, near walls may hide to reveal cargo; load-space dimensions and loading rules do not change.',
        'sim.result.placed': 'Placed Units',
        'sim.result.unplaced': 'Unplaced Units (Over capacity)',
        'sim.result.volume': 'Cargo Volume',
        'sim.result.capacity': 'Container Volume',
        'sim.result.mass': 'Total Cargo Mass',
        'sim.result.payload': 'Max Allowable Payload',
        'sim.result.utilization': 'Space Utilization',
        'sim.result.cog': 'Center of Gravity (CoG)',

        // CBM Calculator
        'cbm.title': 'CBM Calculator (Cubic Volume & Freight Weight)',
        'cbm.desc': 'Calculate CBM, CFT, Freight Ton (W/M) and estimated fits in standard shipping containers.',
        'cbm.col.name': 'Item Name',
        'cbm.col.length': 'Length (cm)',
        'cbm.col.width': 'Width (cm)',
        'cbm.col.height': 'Height (cm)',
        'cbm.col.qty': 'Quantity',
        'cbm.col.weight': 'Unit Wt (kg)',
        'cbm.addRow': 'Add Item Row',
        'cbm.sendToSim': 'Send to 3D Simulation',
        'cbm.metric.totalCbm': 'TOTAL VOLUME (CBM)',
        'cbm.metric.totalGross': 'TOTAL GROSS WEIGHT',
        'cbm.metric.freightTon': 'CHARGEABLE FREIGHT TON (W/M)',
        'cbm.metric.airWeight': 'AIR VOLUMETRIC WEIGHT',
        'cbm.compare.title': 'Standard Container Fit Estimation',
        'cbm.width': 'Width (cm)',
        'cbm.length': 'Length (cm)',
        'cbm.height': 'Height (cm)',
        'cbm.qty': 'Quantity',
        'cbm.calculate': '<i class="fas fa-calculator"></i> Calculate CBM',
        'cbm.perUnit': 'CBM per unit',
        'cbm.total': 'Total CBM',

        // Tools
        'tools.tag': '🚛 Free Logistics Tools',
        'tools.title': 'CBM, Freight, Volume and Container Loading Tools',
        'tools.desc': 'CBM3.net provides practical online tools for logistics teams, exporters, importers, freight forwarders, and international trade professionals.',
        'tools.t1.title': '3D Load Calculator',
        'tools.t1.desc': '3D container loading simulation with multi-algorithm optimization',
        'tools.t2.title': 'CBM Calculator',
        'tools.t2.desc': 'Calculate cargo cubic volume accurately and instantly',
        'tools.t3.title': 'Unit Converter',
        'tools.t3.desc': 'Convert freight weights, lengths, and volume standards',
        'tools.t4.title': 'CO₂ Emissions Calc',
        'tools.t4.desc': 'Estimate transport carbon emissions across shipping modes',
        'tools.t5.title': 'Sea Container Guide',
        'tools.t5.desc': 'Standard ISO shipping container dimensions and specs',
        'tools.t6.title': 'Air Cargo ULD Guide',
        'tools.t6.desc': 'Aircraft unit load device dimensions and weight ratings',
        'tools.startBtn': '<i class="fas fa-rocket"></i> Start a 3D Loading Plan',
        'tools.browseBtn': '<i class="fas fa-th-large"></i> Browse All Tools',

        // Guides
        'guides.title': 'Transport Equipment Guides',
        'guides.desc': 'Comprehensive technical specifications for all freight transport modes.',
        'guides.g1.title': 'Sea Containers',
        'guides.g1.desc': '20DC, 40DC, 40HC, 45HC, Open Top, Flat Rack',
        'guides.g2.title': 'Road Transport',
        'guides.g2.desc': 'Standard trucks, trailers, reefers, box trucks',
        'guides.g3.title': 'Air Cargo (ULD)',
        'guides.g3.desc': 'LD3, LD7, LD11, PMC, PAG pallets',
        'guides.g4.title': 'Rail Freight',
        'guides.g4.desc': 'Boxcars, flatcars, European swap bodies',

        // Footer
        'footer.about': 'TNG Logistics container load calculator & 3D planning platform. Optimizing maritime cargo capacity and global supply chain operations.',
        'footer.legal': 'Legal & Standards',
        'footer.terms': 'TNG Terms of Service',
        'footer.privacy': 'Data Privacy Policy',
        'footer.disclaimer': 'Safe Loading Regulations',
        'footer.contactTitle': 'TNG Contact Info',
        'footer.aboutUs': 'About Us',
        'footer.quickAccess': 'Quick Access',
        'footer.calculator3d': '3D Load Planner',
        'footer.allTools': 'All Logistics Tools',
        'footer.equipGuides': 'Fleet & Container Specs',

        // Sticky Bar
        'sticky.plan': 'Plan 3D Cargo Loading',
        'sticky.summary': 'Summary'
    }
};

// i18n Manager Class
class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('cbm3-lang') || 'vi';
        this.init();
    }

    init() {
        this.updateDOM();
        this.setupLanguageSwitcher();
        document.documentElement.lang = this.currentLang;
    }

    setLanguage(lang) {
        if (translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('cbm3-lang', lang);
            document.documentElement.lang = lang;
            this.updateDOM();
            this.updateActiveButton();
            // Dispatch language change event for other modules
            window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
        }
    }

    updateDOM() {
        // Text content
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = translations[this.currentLang][key];
            if (text !== undefined) {
                el.innerHTML = text;
            }
        });

        // Placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            const text = translations[this.currentLang][key];
            if (text !== undefined) {
                el.setAttribute('placeholder', text);
            }
        });

        // Titles
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            const text = translations[this.currentLang][key];
            if (text !== undefined) {
                el.setAttribute('title', text);
            }
        });

        // Page title
        document.title = this.currentLang === 'vi'
            ? 'TNG Logistics - Máy tính xếp hàng Container 3D'
            : 'TNG Logistics - 3D Container Loading Calculator';
    }

    setupLanguageSwitcher() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            if (btn.getAttribute('data-lang') === this.currentLang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            btn.addEventListener('click', () => {
                const lang = btn.getAttribute('data-lang');
                this.setLanguage(lang);
            });
        });
    }

    updateActiveButton() {
        document.querySelectorAll('.lang-btn').forEach(btn => {
            if (btn.getAttribute('data-lang') === this.currentLang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}

// Global i18n instance
window.i18n = new I18n();
