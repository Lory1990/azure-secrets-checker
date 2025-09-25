import useApiClient from "../useApiClient"

export interface ICertificate{
    daysUntilExpiration: number,
    displayName: string,
    endDateTime: string,
    isExpired: boolean,
    keyId: string,
    source: string,
    type: string,
    usage: string
}

export interface ISecret{
    daysUntilExpiration: number,
    displayName: string,
    endDateTime: string,
    isExpired: boolean,
    keyId: string,
    source: string,
}   


export interface IApplication{
    appId: string
    displayName: string,
    id: string,
    certificates?: ICertificate[]
    secrets?: ISecret[]
}
const useApplicationsApi = () => {

    const apiClient = useApiClient()

    const getAll = async () => {
        return (await apiClient.doRequest<IApplication[]>({url: `/api/applications`})).data
    }

    return {
        getAll
    }

}

export default useApplicationsApi