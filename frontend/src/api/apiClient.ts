import axios, { AxiosRequestConfig, AxiosRequestHeaders, AxiosResponse } from "axios"
import UrlPattern from "url-pattern"

export interface IToken {
    token: string;
    issuer: string;
  }

export enum AuthenticationType {
    REQUIRED,
    OPTIONAL,
    NONE
}

export interface IClientRequestMetadata {
    authenticated?: AuthenticationType
    doNotLog?: boolean
    addUTMFields?: boolean
    eventName?: string
}

export interface IClientRequestData<D> extends AxiosRequestConfig<D>, IClientRequestMetadata {
    urlParams?: Record<string, unknown>
    token?: string
}

export interface IUTMFields {
    utm_source?: string | null
    utm_medium?: string | null
    utm_campaign?: string | null
    utm_term?: string | null
    utm_content?: string | null
}

const createUrl = (axiosOptions?: IClientRequestData<unknown>): string | undefined => {
    if (!axiosOptions) return undefined
    if (axiosOptions.urlParams && axiosOptions.url) {
        return new UrlPattern(axiosOptions.url).stringify(axiosOptions.urlParams)
    }
    return axiosOptions?.url
}

/**
 * Api request - R is the response interface, D is the data interface
 * @param config Initial configuration
 * @returns
 */
async function doRequest<R, D = unknown>(config?: IClientRequestData<D>): Promise<AxiosResponse<R>> {
    const { authenticated = AuthenticationType.REQUIRED, headers, addUTMFields, token, params, doNotLog = false, eventName, ...conf } = config || {}
    try {
        let headersNew: AxiosRequestHeaders | any = {}

        if (config.token) {
            headersNew["Authorization"] = `Bearer ${config.token}`
        }

        headersNew["Content-Type"] = "application/json"
        headersNew["Accept"] = "application/json"

        let queryParams = {
            ...params
        }

        if (headers) headersNew = { ...headersNew, ...headers }
       
        const response = await axios.request<R, AxiosResponse<R>, D>({
            ...conf,
            headers: headersNew,
            params: queryParams,
            url: createUrl(config)
        })

        if (eventName) {
            const event = new CustomEvent(eventName, {
                detail: response.data
            })
            window.dispatchEvent(event)
        }

        return response
    } catch (e) {
        console.error(e)
        throw e
    }
}

export const out = { doRequest }
export default out
