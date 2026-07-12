# Escenario 006: Autenticación por Magic Link (Passwordless)

## Objetivo
Validar que un cliente pueda solicitar el acceso a su cuenta sin contraseña, recibiendo un enlace temporal por correo electrónico que al ser validado por primera vez firma un token de sesión JWT seguro con rol `customer`.

## Pasos para la Simulación / Prueba
1. El cliente envía su dirección de email a `POST /api/v1/auth/magic-link`.
2. El sistema inserta un token criptográfico firmado en `customer_access_tokens` con expiración de 15 minutos.
3. Se encola el job de envío del correo (en entorno local se simula devolviendo el token en el payload).
4. El cliente valida el Magic Link consultando `GET /api/v1/auth/magic-link?token=...`.
5. El sistema verifica la validez del token, lo marca como utilizado en la base de datos y firma el JWT.
6. El cliente intenta validar el mismo enlace una segunda vez. El sistema rechaza la petición.

## Resultado Esperado
*   **Código de Respuesta (Paso 1):** HTTP 200 OK.
*   **Código de Respuesta (Paso 4):** HTTP 200 OK con el accessToken JWT.
*   **Código de Respuesta (Paso 6):** HTTP 401 Unauthorized (token ya utilizado).

## Resultado Obtenido
*   **Estado:** **VALIDADO (Green)**
*   **Evidencia:** Verificado mediante tests en [commerce-core.test.js](file:///Users/sebastianpulido/Downloads/bot2.0/huawei/Tienad/LIAM%20BOT/milego-v6/backend/src/tests/integration/commerce-core.test.js#L62-L95) (`Magic Link Auth Flow`).
