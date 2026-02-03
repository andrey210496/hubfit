import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, ExternalLink, PlayCircle, HelpCircle, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Help {
  id: string;
  title: string;
  description: string | null;
  video: string | null;
  link: string | null;
}

export function HelpsPage() {
  const [helps, setHelps] = useState<Help[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchHelps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('helps')
        .select('*')
        .order('title', { ascending: true });

      if (error) throw error;
      setHelps(data || []);
    } catch (error: any) {
      console.error('Error fetching helps:', error);
      toast.error('Erro ao carregar artigos de ajuda');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHelps();
  }, []);

  const filteredHelps = helps.filter(help =>
    help.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    help.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-background min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-coral">Central de Ajuda</h1>
          <p className="text-muted-foreground">
            Artigos, tutoriais e vídeos para ajudar você
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchHelps} 
          disabled={loading}
          className="neu-button"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar artigos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 neu-pressed border-0"
        />
      </div>

      {/* Help Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredHelps.length === 0 ? (
        <div className="module-card text-center py-16">
          <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {searchTerm ? 'Nenhum artigo encontrado para sua busca' : 'Nenhum artigo de ajuda disponível'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHelps.map((help) => (
            <Card key={help.id} className="module-card group hover:scale-[1.02] transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-10 h-10 rounded-xl gradient-coral flex items-center justify-center">
                    <HelpCircle className="h-5 w-5 text-white" />
                  </div>
                  {help.title}
                </CardTitle>
                {help.description && (
                  <CardDescription className="line-clamp-2">
                    {help.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex gap-2">
                {help.video && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="neu-button flex-1"
                    onClick={() => window.open(help.video!, '_blank')}
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Ver Vídeo
                  </Button>
                )}
                {help.link && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="neu-button flex-1"
                    onClick={() => window.open(help.link!, '_blank')}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Acessar
                  </Button>
                )}
                {!help.video && !help.link && (
                  <span className="text-sm text-muted-foreground">
                    Sem links disponíveis
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
