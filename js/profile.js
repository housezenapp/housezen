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
      // 1. Buscamos si ya existe el vínculo usando el nuevo nombre de columna
        const { data: existingLink } = await _supabase
            .from('perfil_propiedades')
            .select('id_perfil_inquilino') // Cambiado de id_perfil
            .eq('id_perfil_inquilino', currentUser.id) // Cambiado de id_perfil
            .maybeSingle();

        let relacionError = null;

        if (existingLink) {
            // 2. Actualizar vinculación existente
            const { error } = await _supabase
                .from('perfil_propiedades')
                .update({ 
                    id_propiedad: reference
                    // Aquí podrías actualizar también id_perfil_casero si lo buscas antes
                })
                .eq('id_perfil_inquilino', currentUser.id); // Cambiado de id_perfil
            relacionError = error;
        } else {
            // 3. Crear nueva vinculación
            // Nota: Para que el casero vea al inquilino, aquí deberíamos 
            // haber buscado antes el casero_id de la tabla propiedades.
            const { error } = await _supabase
                .from('perfil_propiedades')
                .insert({
                    id_perfil_inquilino: currentUser.id, // Cambiado de id_perfil
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
