/**
 * Antigravity Prompt Generator Engine
 */

let selectedPromptColor = 'Purple-Pink Neon';

function setPromptColor(colorName) {
    selectedPromptColor = colorName;
    generateAntigravityPrompt();
}

function generateAntigravityPrompt() {
    const styleElem = document.getElementById('promptStyle');
    const heroElem = document.getElementById('promptHero');
    if (!styleElem) return;

    const style = styleElem.value;
    const hero = heroElem && heroElem.value ? heroElem.value : 'Nakroth / Lauriel';

    let promptEn = "";
    let promptVi = "";

    if (style === 'cosmic_mythic') {
        promptEn = `[high-quality, masterpiece, 8k, game UI layout], a grand cosmic mythical video game account banner (ratio 720:1100), background featuring a swirling deep galaxy of purple, gold, and turquoise nebulas with floating starry dust. At top center, a large glowing golden Rank 8 crest badge with wings of pure divine energy. Directly below the badge, stylized metallic glowing text "+31,737 UP V9" with red and gold ambient light. Below the header is a row of 6 glowing gold and celestial-blue vertical cards. The middle section is split: left side displays a sleek glowing account stats glass panel, right side features a powerful standing anime character (${hero}) with flowing silver hair, glowing white eyes, and divine white-and-gold enchanted armor, separated by a crackling energy divider. At the bottom, a seamless grid of 56 small game skin slots (7 columns by 8 rows) framed with subtle cosmic crystal borders, glowing magical sigils and ancient runes floating in the void, hyper detailed, dramatic cinematic lighting, unreal engine 5 render --ar 720:1100`;
        promptVi = `[high-quality, masterpiece, 8k, game UI layout] Tạo bức ảnh Banner tài khoản game phong cách Thần Thoại Vũ Trụ (tỷ lệ 720x1100 px). Nền là dải ngân hà rực rỡ sắc tím, vàng hoàng kim và xanh turquoise cùng bụi sao lấp lánh. Phía trên cùng ở giữa là Huy hiệu Rank 8 dát vàng phát sáng rực rỡ với đôi cánh năng lượng thần thánh. Ngay bên dưới huy hiệu là dòng chữ kim loại phát sáng "+31,737 UP V9". Ngay bên dưới là hàng 6 khung thẻ tướng VIP dáng đứng viền năng lượng xanh vàng. Phần giữa chia đôi: bên trái là bảng thông số tài khoản dạng kính phát sáng, bên phải là nhân vật Anime (${hero}) đứng uy nghiêm tóc bạc, mắt trắng phát sáng, mặc giáp chiến thần trắng vàng thần thánh, ngăn cách bởi đường rãnh năng lượng. Phần dưới cùng là lưới 56 ô skin (7 cột x 8 hàng) viền pha lê tinh xảo, xung quanh lơ lửng các cổ tự ma thuật phát sáng, chi tiết siêu nét 8k, ánh sáng điện ảnh ấn tượng.`;
    } else if (style === 'cyberpunk_tech') {
        promptEn = `[high-quality, masterpiece, 8k, UI design asset], a dark futuristic cyberpunk video game profile banner (ratio 720:1100). Background features a high-tech control panel with glowing blue and neon-pink energy grid lines and circuit patterns. At top center, a 3D holographic display showcasing a sharp metallic "RANK 8" icon, with glowing neon text "+31,737 UP V9" directly underneath. Below it, a row of 6 glowing neon cyber-framed character cards. The middle row features a digital stats display on the left with glowing text "SKINS: 304" and "CHAMPIONS: 113", and on the right side a sleek cyborg anime warrior (${hero}) in a stealth black suit with glowing neon blue circuit accents, backed by a sprawling futuristic cityscape with flying vehicles. The bottom area contains a full grid of 56 skin item slots (7x8 layout) with neon blue separator lines, complex textures, realistic cybernetic aesthetics, epic sci-fi atmosphere --ar 720:1100`;
        promptVi = `[high-quality, masterpiece, 8k] Tạo thiết kế Banner profile game phong cách Cyberpunk công nghệ tương lai (tỷ lệ 720x1100 px). Phông nền là bảng điều khiển công nghệ cao với mạng lưới đường dây năng lượng xanh cyan và hồng neon. Chính giữa phía trên là màn hình Hologram 3D hiển thị biểu tượng "RANK 8" kim loại sắc lẹm, phía dưới là chữ neon "+31,737 UP V9". Bên dưới là dãy 6 thẻ tướng viền đèn neon rực rỡ. Phần giữa bao gồm bảng thông số kỹ thuật số bên trái hiển thị chỉ số "SKINS: 304" và "CHAMPIONS: 113", phía bên phải là chiến binh Cyborg (${hero}) ngầu lòi trang phục đen có các dải đèn LED phát sáng, xa xa là thành phố tương lai với xe bay tấp nập. Phần chân banner là lưới 56 ô skin (7x8) viền xanh laser công nghệ, chất lượng 8k sắc nét.`;
    } else if (style === 'ethereal_fantasy') {
        promptEn = `[high-quality, masterpiece, 8k, fantasy UI asset], a magical ethereal fantasy video game account banner layout (ratio 720:1100). Soft twilight background with a majestic distant fairytale castle, gentle pastel color palette of pale blue, soft pink, and lavender mist. At top center, a Rank 7 golden crest framed by glowing golden laurel branches, with elegant glowing text "+31,737 UP V9" below it. Features a row of 6 golden-framed hero cards across the top header. The middle layout presents a soft frosted-glass account stats box on the left, alongside a beautiful anime elven character (${hero}) with long flowing pastel blue hair, glowing crystal earrings, and a serene smile on the right. Floating glowing crystals, magic runes, and pink flower petals drifting through dreamlike lighting. The bottom section consists of a 56-slot skin display grid (7x8) with delicate luminous crystal borders, soft elegant aesthetic --ar 720:1100`;
        promptVi = `[high-quality, masterpiece, 8k] Tạo thiết kế Banner tài khoản game phong cách Thần Tiên Mộng Mơ (Ethereal Fantasy, tỷ lệ 720x1100 px). Phông nền hoàng hôn dịu nhẹ với lâu đài cổ tích thấp thoáng phía xa, tông màu pastel kết hợp xanh băng, hồng phấn và sương mù tím nhạt. Phía trên cùng ở giữa là Huy hiệu Rank 7/8 viền bởi nhành nguyệt quế vàng kim lấp lánh và dòng chữ phát sáng "+31,737 UP V9". Ngay dưới là 6 khung thẻ tướng viền mạ vàng tinh xảo. Phần giữa là bảng thông số dạng kính mờ bên trái, kết hợp cùng nữ Tộc Tiên (${hero}) xinh đẹp tóc xanh pastel mỉm cười dịu dàng bên phải. Tinh thể phát sáng và cánh hoa bay lơ lửng trong ánh sáng mộng mơ. Phần dưới là lưới 56 ô skin (7x8) viền pha lê phát sáng dịu nhẹ, thanh lịch và sang trọng.`;
    } else if (style === 'mythic_frame_pack') {
        promptEn = `[ultra-detailed, asset pack, UI asset, 8k], set of six identical intricate vertical rectangular card frames for high-tier video game skin showcases (aspect ratio ~0.7), crafted from polished obsidian dark metal with glowing 24k gold filigree and radiant ruby gem accents. Corner embellishments feature small stylized dragon wings and mythical creature motifs. A dedicated metallic plate at the bottom designed for text like "MYTHIC" or "LEGEND". Swirling magical energy and light particles inside the inner edges of the frames. Centered grid composition, clean isolated black background for easy UI integration, hyper realistic rendering --ar 16:9`;
        promptVi = `[ultra-detailed, asset pack] Tạo bộ Asset gồm 6 khung thẻ tướng hình chữ nhật đứng đồng bộ dành cho skin cấp VIP/Mythic (tỷ lệ 0.7). Khung được chế tác từ kim loại đen obsidian bóng bẩy kết hợp đường nét chạm khắc vàng 24k và viền đá ruby đỏ phát sáng. Tám góc khung trang trí họa tiết cánh rồng và thần thú cách điệu. Phía chân khung có biển tên kim loại dành cho chữ "MYTHIC" hoặc "LEGEND". Năng lượng ma thuật và hạt sáng xoáy nhẹ bên trong mép khung. Bố cục căn chỉnh gọn gàng trên nền đen đơn sắc dễ tách phôi, chất lượng 8k cực nét.`;
    } else {
        promptEn = `[design pattern, UI asset pack, 8k], a seamless 7x8 matrix tiling grid layout pattern for a video game skin collection showcase, dark geometric structure with glowing sharp neon-blue grid separator lines. Each individual grid cell features subtle dark tech background textures. Select random highlighted cells glow with vivid radiant red and gold energy borders to signify special ultra-rare skins. Modern, clean, high-end game UI dashboard layout design asset, perfectly symmetrical, isolated dark background --ar 16:9`;
        promptVi = `[design pattern, asset] Tạo mẫu layout lưới 56 ô (7 cột x 8 hàng) liền mạch dùng làm giao diện bộ sưu tập Skin Game. Cấu trúc hình học tối màu với các đường rãnh phân cách phát sáng xanh neon sắc nét. Mỗi ô lưới chứa hoa văn chìm công nghệ hiện đại. Điểm xuyết một vài ô lưới ngẫu nhiên phát sáng viền đỏ và vàng rực rỡ tượng trưng cho skin siêu hiếm. Thiết kế UI game hiện đại, sạch đẹp, cân đối hoàn hảo trên phông nền tối.`;
    }

    const outEn = document.getElementById('outPromptEn');
    const outVi = document.getElementById('outPromptVi');

    if (outEn) outEn.innerText = promptEn;
    if (outVi) outVi.innerText = promptVi;
}

function copyToClipboard(elemId) {
    const elem = document.getElementById(elemId);
    if (!elem) return;
    const text = elem.innerText;
    const tempInput = document.createElement('textarea');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);
    showToast("Đã sao chép prompt!");
}
