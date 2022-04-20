import axios from "axios";

export interface JupiterIndexedRouteMapResponse {
  /**
   * All the mints that are indexed to match in indexedRouteMap
   * @type {Array<string>}
   */
  mintKeys: Array<string>;
  /**
   * All the possible route and their corresponding output mints
   * @type {{ [key: string]: Array<number>; }}
   */
  indexedRouteMap: {
    [key: string]: Array<number>;
  };
}

export const getIndexedRouteMap = async (): Promise<
  JupiterIndexedRouteMapResponse | undefined
> => {
  try {
    const response = await axios.get<JupiterIndexedRouteMapResponse>(
      "https://quote-api.jup.ag/v1/indexed-route-map?onlyDirectRoutes=true"
    );
    return response.data;
  } catch (e) {
    console.log(e);
  }
};
