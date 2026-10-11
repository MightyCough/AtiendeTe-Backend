/** Error de dominio que la API traduce a un código HTTP y un mensaje en español. */
export class ErrorHttp extends Error {
  readonly status: number

  constructor(status: number, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorHttp'
    this.status = status
  }
}
