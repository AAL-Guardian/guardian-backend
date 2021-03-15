export interface InstallationRequest {
  clientId: string,
  robotCode: string,
}

export interface InstallationResponse {
  clientId: string,
  token?: string,
  endpoint: string,
  robotTopic: string
}