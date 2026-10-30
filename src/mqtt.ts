// El backend publica el estado del pedido y escucha si la mesa está en línea.
// Tópicos:
//   atiendete/mesa/{numero}/estado     JSON retenido {pedidoId, estado} del pedido
//   atiendete/mesa/{numero}/ocupacion  JSON retenido {estado} de la mesa: LIBRE, OCUPADA o RESERVADA (el LED)
//   atiendete/mesa/{numero}/conexion   texto "online" u "offline" (el ESP32 lo publica)

import mqtt, { type MqttClient } from 'mqtt'
import type { EstadoPedido } from './dominio/estados.js'
import type { EstadoMesa } from './dominio/estados-mesa.js'

export function conectarBroker(url: string): MqttClient {
  const cliente = mqtt.connect(url, {
    clientId: 'atiendete-api',
    reconnectPeriod: 2000,
    connectTimeout: 10_000,
    clean: true,
  })

  cliente.on('connect', () => {
    console.log(`MQTT conectado a ${url}`)
    cliente.subscribe('atiendete/mesa/+/conexion', { qos: 1 }, (error) => {
      if (error) console.error('No se pudo suscribir a la conexión de las mesas', error)
    })
  })

  cliente.on('reconnect', () => {
    console.log('Reintentando conexión MQTT')
  })

  cliente.on('error', (error) => {
    console.error('Error MQTT', error.message)
  })

  return cliente
}

export function publicarEstadoMesa(
  cliente: MqttClient,
  numero: number,
  pedidoId: number,
  estado: EstadoPedido,
): void {
  const topico = `atiendete/mesa/${numero}/estado`
  const mensaje = JSON.stringify({ pedidoId, estado })
  // Retenido: cuando el ESP32 reconecta, Mosquitto le entrega el último estado.
  const publicado = cliente.publish(topico, mensaje, { qos: 1, retain: true })
  if (!publicado) {
    console.error(`No se pudo encolar el estado MQTT de la mesa ${numero}`)
  }
}

export function publicarOcupacionMesa(
  cliente: MqttClient,
  numero: number,
  estado: EstadoMesa,
): void {
  const topico = `atiendete/mesa/${numero}/ocupacion`
  const mensaje = JSON.stringify({ estado })
  // Retenido: el LED recupera el estado de la mesa al reconectar.
  const publicado = cliente.publish(topico, mensaje, { qos: 1, retain: true })
  if (!publicado) {
    console.error(`No se pudo encolar la ocupación MQTT de la mesa ${numero}`)
  }
}

const TOPICO_CONEXION =/^atiendete\/mesa\/(\d+)\/conexion$/

export function leerConexion(
  topico: string,
  payload: Buffer,
): { numero: number; online: boolean } | null {
  const coincidencia = TOPICO_CONEXION.exec(topico)
  if (!coincidencia) return null
  const numero = Number(coincidencia[1])
  const texto = payload.toString('utf8').trim().toLowerCase()
  if (texto !== 'online' && texto !== 'offline') return null
  return { numero, online: texto === 'online' }
}
