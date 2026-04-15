export const authorizationHandler = {
  getToken: (): string => '',
  setToken: (): void => undefined,
  removeToken: (): void => undefined
}

export const errorHandler = {
  handleAuthError: (): boolean => false,
  handleNetworkError: (): void => undefined
}

export const initConfig = (): void => undefined
