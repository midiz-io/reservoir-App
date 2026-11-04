export const exportToCSV = (records: any[], filename: string) => {
  if (!records || !records.length) return;
  
  const headers = [
    'Date', 'Balance', 'Transfer 1', 'Transfer 2', 'Transfer 3',
    'Ice Quantity', 'Ice (LKR)', 'Fuel (LKR)', 'DAF 1779 (LKR)', 'Food (LKR)', 'Other Ops (LKR)',
    'KG (LKR)', 'Center (LKR)', 'Other Purchasing (LKR)', 
    'Capital (LKR)', 'Spending (LKR)', 'Remainder (LKR)'
  ];

  const rows = records.map(r => [
    r.date, r.balance, r.transfer1, r.transfer2, r.transfer3,
    r.iceQuantity, r.ice, r.fuel, r.mileage, r.food, r.otherOps,
    r.purchasingKg, r.purchasingCenter, r.otherPurchasing,
    r.capital, r.spending, r.remainder
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Helper to load external scripts
const loadScript = (src: string) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

export const captureAsImage = async (elementId: string, filename: string, shareWhatsApp = false) => {
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Temporarily fix styles for beautiful capture
    const originalWidth = element.style.width;
    const originalBg = element.style.backgroundColor;
    element.style.width = 'max-content'; // force full table width
    element.style.backgroundColor = '#ffffff'; // force white background
    element.style.padding = '20px'; // add some padding for aesthetics
    
    const scrollables = Array.from(element.querySelectorAll('[class*="overflow-x-auto"]')) as HTMLElement[];
    const originalOverflows = scrollables.map(el => el.style.overflowX);
    scrollables.forEach(el => el.style.overflowX = 'visible');

    // @ts-ignore
    const canvas = await window.html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    
    // Restore styles
    element.style.width = originalWidth;
    element.style.backgroundColor = originalBg;
    element.style.padding = '';
    scrollables.forEach((el, i) => el.style.overflowX = originalOverflows[i]);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    if (shareWhatsApp) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `${filename}.jpg`, { type: 'image/jpeg' });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Center Expenses Report',
            text: 'Here is the latest Center Expenses Report.',
            files: [file]
          });
          return;
        }
      } catch (err) {
        console.log("Web Share API not supported or failed", err);
      }
      
      // Fallback: download the image and redirect to WhatsApp Web/App
      const link = document.createElement('a');
      link.download = `${filename}.jpg`;
      link.href = dataUrl;
      link.click();
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent('I have downloaded the Center Expenses Report image. Please find it attached.')}`;
      window.open(whatsappUrl, '_blank');
    } else {
      const link = document.createElement('a');
      link.download = `${filename}.jpg`;
      link.href = dataUrl;
      link.click();
    }
  } catch (error) {
    console.error('Failed to capture image', error);
    throw error;
  }
};

export const exportToPDF = async (elementId: string, filename: string) => {
  try {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Temporarily fix styles for beautiful PDF capture
    const originalWidth = element.style.width;
    const originalBg = element.style.backgroundColor;
    element.style.width = 'max-content';
    element.style.backgroundColor = '#ffffff';
    element.style.padding = '20px';
    
    const scrollables = Array.from(element.querySelectorAll('[class*="overflow-x-auto"]')) as HTMLElement[];
    const originalOverflows = scrollables.map(el => el.style.overflowX);
    scrollables.forEach(el => el.style.overflowX = 'visible');

    // @ts-ignore
    const canvas = await window.html2canvas(element, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    
    // Restore styles
    element.style.width = originalWidth;
    element.style.backgroundColor = originalBg;
    element.style.padding = '';
    scrollables.forEach((el, i) => el.style.overflowX = originalOverflows[i]);
    
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Failed to export PDF', error);
    throw error;
  }
};
