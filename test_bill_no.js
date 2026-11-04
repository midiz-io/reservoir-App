const generateBillNo = (resName: string) => {
    const prefix = resName.substring(0, 3).toUpperCase();
    const date = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const random = Math.floor(100 + Math.random() * 900); // 3-digit random
    return `${prefix}${date}-${random}`;
};

console.log("Test Bill Number:", generateBillNo("Maha Galgamuwa Tank"));
console.log("Length:", generateBillNo("Maha Galgamuwa Tank").length);
