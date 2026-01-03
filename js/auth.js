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
        console.log('Auth state change:', event);

        if (event === 'SIGNED_IN' && session) {
            await handleUserSession(session);
        } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED' || event === 'TOKEN_REFRESHED') {
            if (event === 'TOKEN_REFRESHED' && session) {
                // Token refrescado correctamente, actualizar usuario actual
                currentUser = session.user;
                console.log('Token refreshed successfully');
            } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
                document.getElementById('login-page').style.display = 'flex';
                document.getElementById('app-content').style.display = 'none';
                document.getElementById('setup-modal').style.display = 'none';
            }
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

    // Escuchar cuando el usuario vuelve a la pestaña para refrescar la sesión
    setupVisibilityListener();
}

// Nueva función para manejar visibilidad de la página
function setupVisibilityListener() {
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden && authInitialized) {
            console.log('Tab became visible, checking session...');
            await refreshSessionIfNeeded();
        }
    });
}

// Nueva función para refrescar la sesión si es necesario
async function refreshSessionIfNeeded() {
    try {
        const { data: { session }, error } = await _supabase.auth.getSession();

        if (error) {
            console.error('Error checking session:', error);
            // Si hay error al obtener sesión, redirigir al login
            logout();
            return;
        }

        if (!session) {
            console.log('No active session, redirecting to login');
            logout();
            return;
        }

        // Actualizar currentUser con la sesión más reciente
        currentUser = session.user;
        console.log('Session validated successfully');

    } catch (err) {
        console.error('Error refreshing session:', err);
    }
}

// Nueva función para validar sesión antes de operaciones críticas
async function ensureValidSession() {
    try {
        const { data: { session }, error } = await _supabase.auth.getSession();

        if (error || !session) {
            console.error('Invalid session detected');
            showToast('Sesión expirada. Por favor, inicia sesión de nuevo.');
            setTimeout(() => logout(), 1500);
            return false;
        }

        currentUser = session.user;
        return true;
    } catch (err) {
        console.error('Error validating session:', err);
        return false;
    }
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
