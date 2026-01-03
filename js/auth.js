async function login() {
    const returnUrl = "https://housezenapp.github.io/housezen/";

    const { data, error } = await _supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: returnUrl
        }
    });

    if (error) {
        showToast("Error al iniciar sesión");
        return;
    }
}

async function logout() {
    console.log("Intentando cerrar sesión...");

    const { error } = await _supabase.auth.signOut();

    localStorage.clear();
    sessionStorage.clear();

    if (error) {
        console.error("Error al cerrar sesión:", error.message);
        window.location.href = "https://housezenapp.github.io/housezen/";
    } else {
        console.log("Sesión cerrada con éxito");
        window.location.href = "https://housezenapp.github.io/housezen/";
    }
}

async function initializeAuth() {
    _supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            await handleUserSession(session);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
            document.getElementById('login-page').style.display = 'flex';
            document.getElementById('app-content').style.display = 'none';
            document.getElementById('setup-modal').style.display = 'none';
        }
    });

    try {
        const { data: { session }, error } = await _supabase.auth.getSession();

        if (error) {
            console.error('Error getting session:', error);
            document.getElementById('login-page').style.display = 'flex';
            document.getElementById('app-content').style.display = 'none';
            return;
        }

        if (session) {
            await handleUserSession(session);
        } else {
            document.getElementById('login-page').style.display = 'flex';
            document.getElementById('app-content').style.display = 'none';
        }
    } catch (err) {
        console.error('Error initializing auth:', err);
        document.getElementById('login-page').style.display = 'flex';
        document.getElementById('app-content').style.display = 'none';
    }

    authInitialized = true;
}

async function handleUserSession(session) {
    try {
        currentUser = session.user;
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';

        const fullName = currentUser.user_metadata?.full_name || "Usuario";
        const firstName = fullName.split(' ')[0];
        const userEmail = currentUser.email || '';

        document.getElementById('user-name').innerText = firstName;
        document.getElementById('profile-name').value = fullName;
        document.getElementById('profile-email').value = userEmail;

        // Crear o actualizar el perfil automáticamente con los datos de Google
        const { error: upsertError } = await _supabase
            .from('perfiles')
            .upsert({
                id: currentUser.id,
                email: userEmail,
                nombre: fullName,
                rol: 'inquilino' // <--- AÑADIR ESTA LÍNEA
            }, {
                onConflict: 'id',
                ignoreDuplicates: false
            });

        if (upsertError) {
            console.error('Error creating/updating profile:', upsertError);
        }

        // Cargar el perfil completo
        const { data: currentProfile, error: profileError } = await _supabase
            .from('perfiles')
            .select('*')
            .eq('id', currentUser.id)
            .maybeSingle();

        if (profileError) {
            console.error('Error loading profile:', profileError);
        }

        // Cargar la propiedad vinculada desde perfil_propiedades
        const { data: vinculacion, error: vinculacionError } = await _supabase
            .from('perfil_propiedades')
            .select('codigo_propiedad')
            .eq('id_perfil_inquilino', currentUser.id)
            .maybeSingle();

        if (vinculacionError) {
            console.error('Error loading property link:', vinculacionError);
        }

        // Si hay vinculación, obtener los datos de la propiedad usando el código
        let propiedadData = null;
        if (vinculacion && vinculacion.codigo_propiedad) {
            const { data: propiedad, error: propError } = await _supabase
                .from('propiedades')
                .select('id, direccion_completa')
                .eq('id', vinculacion.codigo_propiedad)
                .maybeSingle();

            if (propError) {
                console.error('Error loading property:', propError);
            } else {
                propiedadData = propiedad;
            }
        }

        // Verificar si el perfil está completo
        const isProfileComplete = currentProfile && currentProfile.telefono && vinculacion && vinculacion.codigo_propiedad && propiedadData;
        
        if (!isProfileComplete) {
            document.getElementById('setup-modal').style.display = 'flex';
        } else {
            // Ocultar el modal si el perfil está completo
            document.getElementById('setup-modal').style.display = 'none';
            
            // Cargar datos de la propiedad
            document.getElementById('inc-address').value = propiedadData.direccion_completa;
            document.getElementById('user-address').value = propiedadData.direccion_completa;
            document.getElementById('user-reference').value = vinculacion.codigo_propiedad;

            // Cargar teléfono del perfil
            document.getElementById('inc-phone').value = currentProfile.telefono;
            document.getElementById('user-phone').value = currentProfile.telefono;
        }
    } catch (err) {
        console.error('Error in handleUserSession:', err);
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('app-content').style.display = 'block';
        document.getElementById('setup-modal').style.display = 'flex';
    }
}
