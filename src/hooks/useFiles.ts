import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FileRecord {
  id: string;
  name: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  options: FileOption[];
}

export interface FileOption {
  id: string;
  file_id: string;
  name: string;
  path: string;
  media_type: string | null;
  created_at: string;
}

export function useFiles() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const { data: filesData, error: filesError } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      if (filesError) throw filesError;

      // Fetch options for each file
      const filesWithOptions = await Promise.all(
        (filesData || []).map(async (file) => {
          const { data: optionsData } = await supabase
            .from('file_options')
            .select('*')
            .eq('file_id', file.id)
            .order('created_at', { ascending: false });

          return {
            ...file,
            options: optionsData || [],
          };
        })
      );

      setFiles(filesWithOptions);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar arquivos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const createFile = async (name: string, message?: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('files')
        .insert({ name, message, company_id: profile.company_id })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Arquivo criado com sucesso!' });
      fetchFiles();
      return data;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar arquivo',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteFile = async (id: string) => {
    try {
      // First delete all options
      await supabase.from('file_options').delete().eq('file_id', id);
      
      const { error } = await supabase.from('files').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Arquivo excluído!' });
      fetchFiles();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir arquivo',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const uploadFileOption = async (
    fileId: string,
    file: File
  ): Promise<FileOption | null> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const filePath = `${profile.company_id}/${fileId}/${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: optionData, error: optionError } = await supabase
        .from('file_options')
        .insert({
          file_id: fileId,
          name: file.name,
          path: filePath,
          media_type: file.type,
        })
        .select()
        .single();

      if (optionError) throw optionError;

      toast({ title: 'Upload realizado com sucesso!' });
      fetchFiles();
      return optionData;
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const deleteFileOption = async (option: FileOption) => {
    try {
      // Delete from storage
      await supabase.storage.from('files').remove([option.path]);

      // Delete from database
      const { error } = await supabase
        .from('file_options')
        .delete()
        .eq('id', option.id);

      if (error) throw error;

      toast({ title: 'Arquivo removido!' });
      fetchFiles();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao remover arquivo',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const getPublicUrl = (path: string) => {
    const { data } = supabase.storage.from('files').getPublicUrl(path);
    return data.publicUrl;
  };

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    files,
    loading,
    fetchFiles,
    createFile,
    deleteFile,
    uploadFileOption,
    deleteFileOption,
    getPublicUrl,
  };
}
