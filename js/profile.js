async function saveUserData() {
    // 1. Capturamos los datos del nuevo HTML
    const reference = document.getElementById('user-reference').value.trim().toUpperCase();
    const phone = document.getElementById('user-phone').value.trim();

    if (!reference || !phone) {
        showToast("Faltan datos por completar");
        return;
    }

    const btn = document.getElementById('btnSave');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Validando...';

    try {
        // 2. BUSCAMOS LA PROPIEDAD: Verificamos que el código existe en la tabla del casero
        const { data: propiedad, error: propError } = await _supabase
            .from('propiedades') // Tabla del casero
            .select('direccion_completa')
            .eq('referencia', reference)
            .maybeSingle();

        if (propError) throw propError;

        if (!propiedad) {
            showToast("Código no encontrado. Revisa con tu casero.");
            btn.disabled = false;
            btn.innerHTML = 'Guardar y Vincular';
            return;
        }

        // 3. GUARDAMOS EN PERFILES: Si el código es válido, actualizamos solo dirección y teléfono
        const { error: perfilError } = await _supabase
            .from('perfiles')
            .update({
                direccion: propiedad.direccion_completa, // Heredamos la dirección
                telefono: phone
            })
            .eq('id', currentUser.id);

        if (perfilError) throw perfilError;

        // 4. ACTUALIZAMOS LA INTERFAZ
        // Escribimos la dirección en el campo bloqueado del perfil
        document.getElementById('user-address').value = propiedad.direccion_completa;
        
        // También la actualizamos en el formulario de incidencias (home)
        if (document.getElementById('inc-address')) {
            document.getElementById('inc-address').value = propiedad.direccion_completa;
        }
        if (document.getElementById('inc-phone')) {
            document.getElementById('inc-phone').value = phone;
        }

        showToast("¡Vivienda vinculada correctamente!");
        btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Listo!';
        btn.classList.add('success');

        // Volvemos a la home después de un momento
        setTimeout(() => {
            btn.classList.remove('success');
            btn.innerHTML = 'Guardar y Vincular';
            btn.disabled = false;
            showPage('home');
        }, 1500);

    } catch (error) {
        console.error("Error en la vinculación:", error);
        showToast("Error de conexión con la base de datos");
        btn.disabled = false;
        btn.innerHTML = 'Guardar y Vincular';
    }
}
