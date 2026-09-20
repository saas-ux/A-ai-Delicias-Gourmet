const SUPABASE_URL = "https://jmxglrrwlsvzgywhhuzm.supabase.co";
const SUPABASE_KEY = "sb_publishable_QCwzTU5BhB1zIWQQuh4HUw_3cblq6EC";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);
console.log("Supabase conectado:", supabaseClient);

async function testarSupabase() {
    const { data, error } = await supabaseClient
        .from("produtos")
        .select("*");

    if (error) {
        console.error("Erro ao acessar produtos:", error);
        return;
    }

    console.log("Produtos encontrados:", data);
}

testarSupabase();