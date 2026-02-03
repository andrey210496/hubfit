// Template for contact list import
export const CONTACT_TEMPLATE_HEADERS = ['nome', 'numero', 'email'];

export function downloadContactTemplate() {
  const headers = CONTACT_TEMPLATE_HEADERS.join(';');
  const exampleRows = [
    'João Silva;5511999999999;joao@email.com',
    'Maria Santos;5521988888888;maria@email.com',
    'Pedro Oliveira;5531977777777;',
  ];
  
  const csvContent = [headers, ...exampleRows].join('\n');
  
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'modelo_importacao_contatos.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ParsedContact {
  name: string;
  number: string;
  email?: string;
}

export function parseContactsCSV(content: string): { contacts: ParsedContact[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const errors: string[] = [];
  const contacts: ParsedContact[] = [];

  if (lines.length === 0) {
    errors.push('Arquivo vazio');
    return { contacts, errors };
  }

  // Skip header if present
  const headerLine = lines[0].toLowerCase();
  const startIndex = headerLine.includes('nome') || headerLine.includes('numero') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Support both semicolon and comma as delimiters
    const delimiter = line.includes(';') ? ';' : ',';
    const parts = line.split(delimiter).map(p => p.trim().replace(/^["']|["']$/g, ''));

    if (parts.length < 2) {
      errors.push(`Linha ${i + 1}: formato inválido (esperado: nome;numero;email)`);
      continue;
    }

    const [name, number, email] = parts;

    if (!name || name.length < 2) {
      errors.push(`Linha ${i + 1}: nome inválido ou muito curto`);
      continue;
    }

    // Clean and validate number
    const cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      errors.push(`Linha ${i + 1}: número "${number}" inválido (mínimo 10 dígitos)`);
      continue;
    }

    contacts.push({
      name,
      number: cleanNumber,
      email: email && email.includes('@') ? email : undefined,
    });
  }

  return { contacts, errors };
}
