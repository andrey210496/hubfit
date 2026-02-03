import { useState } from 'react';
import {
  FolderOpen,
  Plus,
  Trash2,
  Upload,
  File,
  Image,
  FileText,
  Download,
  RefreshCw,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFiles, FileRecord, FileOption } from '@/hooks/useFiles';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function FilesPage() {
  const {
    files,
    loading,
    fetchFiles,
    createFile,
    deleteFile,
    uploadFileOption,
    deleteFileOption,
    getPublicUrl,
  } = useFiles();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileMessage, setNewFileMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null);
  const [optionToDelete, setOptionToDelete] = useState<FileOption | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    await createFile(newFileName, newFileMessage || undefined);
    setNewFileName('');
    setNewFileMessage('');
    setIsCreateOpen(false);
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    await deleteFile(fileToDelete.id);
    setFileToDelete(null);
    if (selectedFile?.id === fileToDelete.id) {
      setSelectedFile(null);
    }
  };

  const handleDeleteOption = async () => {
    if (!optionToDelete) return;
    await deleteFileOption(optionToDelete);
    setOptionToDelete(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedFile || !e.target.files?.length) return;
    setIsUploading(true);
    
    for (const file of Array.from(e.target.files)) {
      await uploadFileOption(selectedFile.id, file);
    }
    
    setIsUploading(false);
    e.target.value = '';
  };

  const getFileIcon = (mediaType: string | null) => {
    if (!mediaType) return <File className="h-8 w-8 text-muted-foreground" />;
    if (mediaType.startsWith('image/'))
      return <Image className="h-8 w-8 text-blue-500" />;
    if (mediaType.includes('pdf'))
      return <FileText className="h-8 w-8 text-red-500" />;
    return <File className="h-8 w-8 text-muted-foreground" />;
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Arquivos</h1>
          <p className="text-muted-foreground">
            Gerencie seus arquivos e documentos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchFiles} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova Pasta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Pasta</DialogTitle>
                <DialogDescription>
                  Crie uma pasta para organizar seus arquivos
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome</label>
                  <Input
                    placeholder="Nome da pasta"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descrição (opcional)</label>
                  <Textarea
                    placeholder="Descrição da pasta"
                    value={newFileMessage}
                    onChange={(e) => setNewFileMessage(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateFile} disabled={!newFileName.trim()}>
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
        {/* Files List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Pastas
            </CardTitle>
            <CardDescription>
              {files.length} pasta{files.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-380px)]">
              <div className="space-y-1 p-4 pt-0">
                {files.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma pasta criada
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedFile?.id === file.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FolderOpen className="h-5 w-5 text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.options.length} arquivo{file.options.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFileToDelete(file);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* File Details */}
        <Card className="lg:col-span-2">
          {selectedFile ? (
            <>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedFile.name}</CardTitle>
                    {selectedFile.message && (
                      <CardDescription className="mt-1">
                        {selectedFile.message}
                      </CardDescription>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Criado em{' '}
                      {format(new Date(selectedFile.created_at), "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  <div>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      multiple
                      onChange={handleUpload}
                    />
                    <Button
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isUploading ? 'Enviando...' : 'Upload'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-420px)]">
                  {selectedFile.options.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum arquivo nesta pasta</p>
                      <p className="text-sm">Clique em Upload para adicionar</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedFile.options.map((option) => (
                        <Card key={option.id} className="overflow-hidden">
                          <div className="p-4">
                            <div className="flex items-start gap-3">
                              {getFileIcon(option.media_type)}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate" title={option.name}>
                                  {option.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {option.media_type || 'Arquivo'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {format(new Date(option.created_at), 'dd/MM/yyyy HH:mm')}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                asChild
                              >
                                <a
                                  href={getPublicUrl(option.path)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Download className="mr-1 h-3 w-3" />
                                  Baixar
                                </a>
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setOptionToDelete(option)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione uma pasta para ver os arquivos</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Delete File Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os arquivos dentro da pasta
              também serão excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFile}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Option Dialog */}
      <AlertDialog open={!!optionToDelete} onOpenChange={() => setOptionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOption}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
