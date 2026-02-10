import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://supabase.metodogestorpro.com';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzUwMzg4NDAwLCJleHAiOjE5MDgxNTQ4MDB9.yPS09C5q7E4W5YEnA1jLwfm2FWxWsKwAGya1tPlCBUc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const USER_ID = '181cbd27-80d3-4731-a0e8-97ee4603da04';

async function setupCompany() {
    console.log('1. Criando empresa...');

    // Criar empresa (sem owner_id, a tabela não tem esse campo)
    const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
            name: 'Metodo Gestor Pro',
            status: 'active',
            email: 'andreymarcondes70@gmail.com'
        })
        .select()
        .single();

    if (companyError) {
        console.error('Erro ao criar empresa:', companyError.message);

        // Tentar buscar empresa existente
        const { data: existing } = await supabase
            .from('companies')
            .select('*')
            .limit(1)
            .single();

        if (existing) {
            console.log('Empresa existente encontrada:', existing.id);
            await updateProfile(existing.id);
            return;
        }
        return;
    }

    console.log('✅ Empresa criada:', company.id);
    await updateProfile(company.id);
}

async function updateProfile(companyId) {
    console.log('2. Atualizando perfil do usuário...');

    // Verificar se o perfil existe
    const { data: existingProfile, error: profileCheckError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', USER_ID)
        .single();

    console.log('Profile check:', existingProfile, profileCheckError?.message);

    if (!existingProfile) {
        // Criar perfil
        const { error: insertError } = await supabase
            .from('profiles')
            .insert({
                user_id: USER_ID,
                company_id: companyId,
                profile: 'admin',
                name: 'Andrey Marcondes',
                email: 'andreymarcondes70@gmail.com'
            });

        if (insertError) {
            console.error('Erro ao criar perfil:', insertError.message);
            return;
        }
        console.log('✅ Perfil criado com sucesso!');
    } else {
        // Atualizar perfil existente
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                company_id: companyId,
                profile: 'admin'
            })
            .eq('user_id', USER_ID);

        if (updateError) {
            console.error('Erro ao atualizar perfil:', updateError.message);
            return;
        }
        console.log('✅ Perfil atualizado com sucesso!');
    }

    // Adicionar role de admin
    console.log('3. Adicionando role de admin...');
    const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({
            user_id: USER_ID,
            role: 'admin'
        }, { onConflict: 'user_id,role' });

    if (roleError) {
        console.error('Erro ao adicionar role:', roleError.message);
    } else {
        console.log('✅ Role admin adicionada!');
    }

    console.log('\n🎉 Configuração concluída! Faça logout e login novamente.');
}

setupCompany();
