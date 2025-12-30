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
        // Buscar la propiedad por código de referencia
        const { data: propiedad, error: propError } = await _supabase
            .from('propiedades')
            .select('direccion_completa')
            .eq('id', reference)
            .maybeSingle();

        if (propError) throw propError;

        if (!propiedad) {
            showToast("Código no encontrado. Revisa con tu casero.");
            btn.disabled = false;
            btn.innerHTML = 'Guardar y Vincular';
            return;
        }

        // Actualizar el teléfono en el perfil
        const { error: perfilError } = await _supabase
            .from('perfiles')
            .update({ telefono: phone })
            .eq('id', currentUser.id);

        if (perfilError) throw perfilError;

        // Crear o actualizar relación en perfil_propiedades
        const { data: existingLink } = await _supabase
            .from('perfil_propiedades')
            .select('id_perfil')
            .eq('id_perfil', currentUser.id)
            .maybeSingle();

        let relacionError = null;

        if (existingLink) {
            // Actualizar vinculación existente
            const { error } = await _supabase
                .from('perfil_propiedades')
                .update({ id_propiedad: reference })
                .eq('id_perfil', currentUser.id);
            relacionError = error;
        } else {
            // Crear nueva vinculación
            const { error } = await _supabase
                .from('perfil_propiedades')
                .insert({
                    id_perfil: currentUser.id,
                    id_propiedad: reference
                });
            relacionError = error;
        }

        if (relacionError) throw relacionError;

        // Actualizar la interfaz
        document.getElementById('user-address').value = propiedad.direccion_completa;
        document.getElementById('user-reference').value = reference;

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
