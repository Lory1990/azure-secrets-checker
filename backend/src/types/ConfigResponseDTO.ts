export default interface ConfigResponseDTO {
    tenantId: string
    clientId: string
    redirectUri?: string
    authority?: string
    scopes?: string
    apiAudience?: string
}
