# Guía de Desarrollo y Convenciones

## 1. Git y Commits
Se utiliza la convención **Conventional Commits**:
- `feat:` Nuevas funcionalidades.
- `fix:` Corrección de errores.
- `refactor:` Refactorización sin cambio de comportamiento.
- `test:` Inclusión o ajuste de pruebas.
- `docs:` Cambios en documentación.
- `chore:` Tareas de mantenimiento o configuración.

## 2. Regla Fundamental de Modificación de Código
1. Identificar dependencias antes de editar.
2. Implementar únicamente la tarea asignada (evitar alcance no solicitado).
3. Reutilizar componentes de `shared/` antes de crear nuevos.
4. Crear pruebas correspondientes.
5. Ejecutar builds y pruebas de forma local antes de hacer commit.
