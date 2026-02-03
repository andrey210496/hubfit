import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Download, Search, Filter, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ExcelJS from 'exceljs';

interface InvoiceWithCompany {
  id: string;
  company_id: string;
  detail: string | null;
  status: string | null;
  value: number | null;
  due_date: string | null;
  created_at: string | null;
  company?: { name: string; email: string | null } | null;
}

interface Company {
  id: string;
  name: string;
}

export default function InvoicesReportPage() {
  const [invoices, setInvoices] = useState<InvoiceWithCompany[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    setCompanies(data || []);
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('invoices')
        .select('*, company:companies(name, email)')
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (companyFilter !== 'all') {
        query = query.eq('company_id', companyFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filteredData = filteredData.filter(
          (inv) =>
            inv.detail?.toLowerCase().includes(term) ||
            inv.company?.name?.toLowerCase().includes(term)
        );
      }

      setInvoices(filteredData);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar faturas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [startDate, endDate, statusFilter, companyFilter]);

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'open':
        return <Badge variant="secondary">Aberto</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Vencido</Badge>;
      default:
        return <Badge variant="outline">{status || 'Indefinido'}</Badge>;
    }
  };

  const getStatusText = (status: string | null) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'open':
        return 'Aberto';
      case 'overdue':
        return 'Vencido';
      default:
        return status || 'Indefinido';
    }
  };

  const exportToExcel = async () => {
    try {
      setExporting(true);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Faturas');

      // Define columns with widths
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 36 },
        { header: 'Empresa', key: 'empresa', width: 30 },
        { header: 'Email Empresa', key: 'email', width: 30 },
        { header: 'Descrição', key: 'descricao', width: 40 },
        { header: 'Valor', key: 'valor', width: 15 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Vencimento', key: 'vencimento', width: 12 },
        { header: 'Criado em', key: 'criado', width: 12 },
      ];

      // Add rows
      invoices.forEach((inv) => {
        worksheet.addRow({
          id: inv.id,
          empresa: inv.company?.name || '-',
          email: inv.company?.email || '-',
          descricao: inv.detail || '-',
          valor: inv.value || 0,
          status: getStatusText(inv.status),
          vencimento: formatDate(inv.due_date),
          criado: formatDate(inv.created_at),
        });
      });

      // Style header row
      worksheet.getRow(1).font = { bold: true };

      // Generate and download file
      const fileName = `relatorio_faturas_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: 'Exportação concluída',
        description: `Arquivo ${fileName} baixado com sucesso.`,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao exportar',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setCompanyFilter('all');
    setSearchTerm('');
  };

  const totalValue = invoices.reduce((acc, inv) => acc + (inv.value || 0), 0);
  const paidValue = invoices.filter((inv) => inv.status === 'paid').reduce((acc, inv) => acc + (inv.value || 0), 0);
  const pendingValue = invoices.filter((inv) => inv.status !== 'paid').reduce((acc, inv) => acc + (inv.value || 0), 0);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Relatório de Faturas</h2>
          <p className="text-muted-foreground">Visualize e exporte faturas do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchInvoices} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button onClick={exportToExcel} disabled={exporting || invoices.length === 0} className="gap-2">
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total ({invoices.length} faturas)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Pago</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(paidValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{formatCurrency(pendingValue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="overdue">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FileSpreadsheet className="h-12 w-12 mb-4" />
              <p>Nenhuma fatura encontrada</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Criado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.company?.name || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{invoice.detail || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(invoice.value)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell>{formatDate(invoice.due_date)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(invoice.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
