# Guia: credenciales de prueba Polygon y activacion on-chain

Esta guia habilita el guardado real en blockchain para:

- `anchorMerkleRoot` (anclaje de Merkle root)
- `revokeHash` (revocacion de hash)

El sistema ya funciona en modo fallback sin credenciales. Cuando configuras las variables de entorno de esta guia, cambia automaticamente a modo real on-chain.

## 1. Red recomendada de pruebas

- Red: `Polygon Amoy` (testnet)
- Chain ID: `80002`
- Moneda de prueba: `POL` de faucet

## 2. Crear wallet de pruebas

1. Crea una wallet nueva para pruebas (no uses llaves de produccion).
2. Exporta su private key.
3. Guarda la llave de forma local y segura.

## 3. Obtener fondos de prueba

1. Abre un faucet compatible con Amoy.
2. Solicita `POL` de prueba para la direccion de tu wallet.
3. Verifica saldo antes de ejecutar anclajes/revocaciones.

## 4. Preparar endpoint RPC

Usa un RPC provider para Amoy (Alchemy, Infura, QuickNode, o endpoint propio).

Ejemplo de URL:

```text
https://polygon-amoy.g.alchemy.com/v2/TU_API_KEY
```

## 5. Contrato y ABI

Necesitas un contrato desplegado en Amoy que implemente estas funciones:

```solidity
function anchorMerkleRoot(bytes32 merkleRoot) external returns (bool);
function revokeHash(bytes32 hashToRevoke) external returns (bool);
```

Si no pasas ABI personalizado, el sistema usa por defecto esas dos firmas.

## 6. Variables de entorno

Configura en tu `.env.local` (o ambiente equivalente):

```bash
# Prioridad web3 Polygon
POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/TU_API_KEY
POLYGON_CHAIN_ID=80002
POLYGON_PRIVATE_KEY=0xTU_PRIVATE_KEY_DE_PRUEBA
POLYGON_CONTRACT_ADDRESS=0xTU_CONTRATO_EN_AMOY

# Opcional: ABI completo en JSON (si el contrato requiere mas precision)
# POLYGON_CONTRACT_ABI_JSON=[{"inputs":[{"internalType":"bytes32","name":"merkleRoot","type":"bytes32"}],"name":"anchorMerkleRoot","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"hashToRevoke","type":"bytes32"}],"name":"revokeHash","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]
```

Notas:

- `POLYGON_*` tiene prioridad sobre `RPC_URL`, `CHAIN_ID` y `CONTRACT_ADDRESS`.
- Si falta cualquiera entre RPC/private key/contract address, se usa fallback y no se envia transaccion real.

## 7. Validar que ya estas en modo real

1. Crea un evento con `web3Enabled: true`.
2. Ejecuta flujo: crear -> autorizar -> firmar -> generar.
3. Verifica que la respuesta de `generate` incluya `polygonTxHash` real.
4. Ejecuta revocacion y valida `txHash` real en la respuesta/saga.
5. Busca ambas transacciones en un explorador de Amoy.

## 8. Formato de hash requerido

El backend exige `bytes32` hex estricto (`64` caracteres hex, con o sin `0x`).

Ejemplos validos:

- `f3...` (64 hex)
- `0xf3...` (0x + 64 hex)

Si llega otro formato, el backend devuelve error de validacion.

## 9. Seguridad minima para pruebas

- Usa wallet dedicada solo a test.
- No subas `.env.local` al repositorio.
- Rota llaves de prueba si se exponen.
