import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface BillViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: any;
}

export function BillViewDialog({ open, onOpenChange, bill }: BillViewDialogProps) {
  if (!bill) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center justify-between">
            <span>Invoice #{bill.bill_no}</span>
            <Badge variant={bill.status === 'approved' ? 'default' : bill.status === 'rejected' ? 'destructive' : 'secondary'} className="text-sm">
              {bill.status === 'approved' ? 'Approved' : bill.status === 'rejected' ? 'Rejected' : 'Pending'}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Submitted on {new Date(bill.bill_date).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase">Supplier & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="font-semibold">{bill.supplier_name}</p>
                <p className="text-sm text-muted-foreground">{bill.supplier_address || 'No address'}</p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-sm font-semibold">Reservoir: {bill.reservoirs?.name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">Location: {bill.reservoirs?.locations?.name || 'Unknown'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase">Staff Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Field Officer:</span>
                <span className="font-medium">{bill.employees?.full_name || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purchaser:</span>
                <span className="font-medium">{bill.purchaser_name || '—'}</span>
              </div>
              <div className="flex justify-between pt-2 border-t mt-2">
                <span className="text-muted-foreground">Reviewed By:</span>
                <span className="font-medium">{bill.reviewed_by ? 'Admin' : 'Pending'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6">
          <h3 className="font-bold mb-3 text-lg">Harvest Items</h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Grading / Description</TableHead>
                  <TableHead className="text-right">Qty (kg)</TableHead>
                  <TableHead className="text-right">Unit Price (Rs)</TableHead>
                  <TableHead className="text-right">Line Total (Rs)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.items?.map((item: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-right font-mono">{Number(item.qty).toFixed(3)}</TableCell>
                    <TableCell className="text-right font-mono">{Number(item.unit_price).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono font-bold">{(Number(item.qty) * Number(item.unit_price)).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-end">
            <div className="text-right bg-muted/50 p-4 rounded-xl inline-block min-w-[200px]">
              <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Grand Total</p>
              <p className="text-2xl font-black text-emerald-600">Rs. {Number(bill.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>

        {(bill.box_number || bill.sealing_tag_number || bill.remarks) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Card className="bg-muted/30">
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-bold">Box Numbers:</span>
                  <span>{bill.box_number || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Tag Numbers:</span>
                  <span>{bill.sealing_tag_number || '—'}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="font-bold text-sm mb-1">Remarks / Ice Qty</p>
                <p className="text-sm whitespace-pre-wrap">{bill.remarks || 'None'}</p>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
