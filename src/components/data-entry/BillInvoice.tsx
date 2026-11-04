import React from 'react';

interface BillItem {
    description: string;
    qty: number | string;
    unit_price: number | string;
    line_total: number;
}

interface BillInvoiceProps {
    billNo: string;
    billDate: string;
    supplierName: string;
    supplierTel?: string;
    supplierEmail?: string;
    supplierAddress?: string;
    purchaserName?: string;
    sealingTagNumber: string;
    boxNumber?: string;
    remarks?: string;
    items: BillItem[];
    total: number;
    reservoirName?: string;
}

export const BillInvoice: React.FC<BillInvoiceProps> = ({
    billNo,
    billDate,
    supplierName,
    supplierTel,
    supplierEmail,
    supplierAddress,
    purchaserName,
    sealingTagNumber,
    boxNumber,
    remarks,
    items,
    total,
    reservoirName,
}) => {
    // Fill with empty rows to match paper form look (approx 10 total items)
    const emptyRows = Array.from({ length: Math.max(0, 10 - items.length) });

    return (
        <div className="bg-white p-6 max-w-[210mm] mx-auto text-black font-sans border border-slate-200 print:border-none print:p-4">
            {/* Logo and Main Title */}
            <div className="flex flex-col items-center mb-6">
                <div className="w-64 h-20 relative flex-shrink-0">
                    <img
                        src="/Divron-Logo.jpg"
                        alt="Divron Bioventures Logo"
                        className="w-full h-full object-contain"
                    />
                </div>
            </div>

            {/* Header Contact Info & Meta */}
            <div className="grid grid-cols-2 gap-4 text-[11px] mb-4">
                <div className="space-y-0.5">
                    <p>Tel : 031 222 6848</p>
                    <p>E-mail : sudeni@divron.com</p>
                    <p>No. 75, Thalahena, 11504, Negombo.</p>
                </div>
                <div className="text-right flex flex-col items-end space-y-2">
                    <div className="flex items-baseline">
                        <span className="mr-2">Bill No.</span>
                        <span className="font-mono text-lg font-bold border-b border-dotted border-black px-4 min-w-[100px] inline-block">{billNo}</span>
                    </div>
                    <div className="flex items-baseline">
                        <span className="mr-2">Date :</span>
                        <span className="font-mono border-b border-dotted border-black px-4 min-w-[120px] inline-block">
                            {billDate ? new Date(billDate).toLocaleDateString() : '.........................'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Supplier Row */}
            <div className="mb-4 text-xs space-y-1">
                <div className="flex items-baseline">
                    <span className="mr-2 whitespace-nowrap">Name of the Supplier :</span>
                    <span className="font-semibold border-b border-dotted border-black flex-1 min-w-[300px]">
                        {supplierName}
                    </span>
                </div>
                {(supplierTel || supplierEmail || supplierAddress) && (
                    <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-600 pl-4 italic">
                        {supplierTel && <span>Tel: {supplierTel}</span>}
                        {supplierEmail && <span className="truncate">Email: {supplierEmail}</span>}
                        {supplierAddress && <span className="col-span-1 truncate">Address: {supplierAddress}</span>}
                    </div>
                )}
            </div>

            {/* Main Table */}
            <div className="mb-6">
                <table className="w-full border-collapse border border-black text-xs uppercase font-bold">
                    <thead>
                        <tr>
                            <th className="border border-black p-1 text-center w-[45%]">ITEM</th>
                            <th className="border border-black p-1 text-center w-[15%]">QTY.</th>
                            <th className="border border-black p-1 text-center w-[20%]">PRICE</th>
                            <th className="border border-black p-1 text-center w-[20%]">VALUE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={idx} className="h-8">
                                <td className="border border-black px-2 py-1 align-middle">{item.description}</td>
                                <td className="border border-black px-2 py-1 text-center align-middle">{item.qty}</td>
                                <td className="border border-black px-2 py-1 text-right align-middle">{Number(item.unit_price).toLocaleString()}</td>
                                <td className="border border-black px-2 py-1 text-right align-middle">{item.line_total.toLocaleString()}</td>
                            </tr>
                        ))}
                        {emptyRows.map((_, idx) => (
                            <tr key={`empty-${idx}`} className="h-8">
                                <td className="border border-black px-2 py-1"></td>
                                <td className="border border-black px-2 py-1 text-center"></td>
                                <td className="border border-black px-2 py-1 text-right"></td>
                                <td className="border border-black px-2 py-1 text-right"></td>
                            </tr>
                        ))}
                        <tr>
                            <td colSpan={3} className="border border-black px-2 py-2 text-right invisible">Total</td>
                            <td className="border border-black px-2 py-2 text-right font-black text-lg bg-slate-50">
                                {total.toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-x-20 gap-y-8 text-[11px] mb-8">
                <div className="text-center pt-8">
                    <div className="border-b border-black border-dotted mb-1"></div>
                    <p>Supplier Signature</p>
                </div>
                <div className="text-right pt-8 relative">
                    <div className="flex items-baseline justify-end">
                        <span className="mr-2 italic">Sign :</span>
                        <div className="border-b border-black border-dotted flex-1 max-w-[150px]"></div>
                    </div>
                    <p className="mt-1 font-bold">Purchased By</p>
                </div>
            </div>

            <div className="mb-6 text-xs w-full flex items-baseline">
                <span className="mr-2">Name of Purchaser :</span>
                <span className="font-semibold border-b border-dotted border-black flex-1">
                    {purchaserName || '....................................................................................'}
                </span>
            </div>

            {/* Collection Center and Manager Area */}
            <div className="mb-6 border-t border-b border-black py-4">
                <div className="grid grid-cols-2 gap-4 text-[10px]">
                    <div className="border-r border-black pr-4 space-y-4">
                        <div className="flex items-center">
                            <span className="w-24">Received at</span>
                            <div className="flex-1 flex gap-4">
                                <span>Date : .........................</span>
                                <span>Time : .........................</span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <span className="w-24">Collection Center</span>
                            <div className="flex-1 border-b border-dotted border-black italic">
                                {reservoirName || '.......................................................'}
                            </div>
                        </div>
                    </div>
                    <div className="pl-4 space-y-4">
                        <div className="flex items-center">
                            <span className="w-16">Centre</span>
                            <div className="flex-1 flex gap-4">
                                <span>Date : .........................</span>
                                <span>Time : .........................</span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <span className="w-16">Manager</span>
                            <div className="flex-1 border-b border-dotted border-black">
                                .......................................................
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Remarks Section */}
            <div className="text-xs space-y-4">
                <div className="flex items-baseline gap-2">
                    <span className="font-bold">Remarks :</span>
                    <div className="flex-1 border-b border-dotted border-black min-h-[1.2rem] italic">
                        {remarks ? `${boxNumber ? `Box: ${boxNumber} - ` : ''}${remarks}` : ''}
                    </div>
                </div>
                <div className="border-b border-dotted border-black min-h-[1.2rem]"></div>
            </div>

            <div className="mt-8 text-center text-[9px] text-slate-400 print:hidden">
                * Designed to match official paper form layout
            </div>
        </div>
    );
};
