import fetch, { RequestInit, Response } from "node-fetch";

interface ICookie {
  name: string;
  value: string;
  expires: number;
}

export interface IWebLoginOptions {
  baseURL: string;
  username: string;
  password: string;
  loginPath: string;
  sessionidCookieName: string;
  middlewaretokenName?: string;
}

class WebLoginManager {
  private baseURL: string;
  private loginPath: string;
  private username: string;
  private password: string;
  private sessionid: string;
  private middlewaretoken: string | undefined;

  private cookies: ICookie[] = [];

  constructor(options: IWebLoginOptions) {
    this.baseURL = options.baseURL;
    this.username = options.username;
    this.password = options.password;
    this.loginPath = options.loginPath;
    this.sessionid = options.sessionidCookieName;
    this.middlewaretoken = options.middlewaretokenName;
  }

  /**
   * Uses node-fetch to make a request with cookies, and autmoatically stores cookies from the response. Also tries to log in if a 'sessionid' cookie is not present.
   *
   * @param path Path for the fetch, example: "/my/path".
   * @param options Optional fetch options.
   * @param skipLogin Flag to set if login should be skipped.
   * @returns Response.
   */
  public fetch = async (path: string, options?: RequestInit, skipLogin: boolean = false): Promise<Response> => {
    // Might need to login first
    if (!skipLogin) {
      const cookies = this.getCookies();

      // Log in if sessionid cookie does not exist
      if (!cookies.includes(this.sessionid)) {
        await this.login();
      }
    }

    // Add cookies to request header
    const o: RequestInit = { ...options, headers: { ...options?.headers, cookie: this.getCookies() } };

    return fetch(this.baseURL + path, o).then(res => {
      // Update cookies
      this.updateCookies(res);
      return res;
    });
  };

  /**
   * Log in by providing the user credentials and the 'csrfmiddlewaretoken' located at the login form. If login is successful the instance will have stored a 'sessionid' cookie for later fetches.
   */
  public login = async (): Promise<void> => {
    let token = "";

    // Need to get the middleware token if there is one
    if (this.middlewaretoken) {
      // Fetch the login page
      const res = await this.fetch(this.loginPath, undefined, true);

      // Find the CSRF middleware token in the form
      // Using a regular expression to match both alternatives:
      //    name="csrfmiddlewaretoken" value="ASDF"
      //    name='csrfmiddlewaretoken' value='ASDF'
      const r = new RegExp(`${this.middlewaretoken}\\S value=\\S(\\w+)`, "g");
      const regexp = r.exec(await res.text());
      // const regexp = /\S value=\S(\w+)/g.exec(await res.text());
      token = regexp ? regexp[1] : "";
    }

    const loginOptions: RequestInit = {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: `${this.middlewaretoken}=${token}&username=${this.username}&password=${this.password}`, // &next=${next}`,
    };

    // Try to log in
    await this.fetch(this.loginPath, loginOptions, true);
  };

  /**
   * @returns The currently stored, non-expired, cookies.
   */
  private getCookies = (): string => {
    const a: string[] = [];
    const d = Date.now();
    this.cookies.forEach(c => {
      if (d >= c.expires) {
        c.value = "";
      }
      a.push(`${c.name}=${c.value}`);
    });

    this.cookies = this.cookies.filter(c => c.value !== "");

    return a.join("; ");
  };

  /**
   * Update the current cookies based on the 'set-cookie' header in a fetch Response.
   *
   * @param response The Response to parse.
   */
  private updateCookies = (response: Response): void => {
    // Get the cookies to set from the header
    const cookies = response.headers.raw()["set-cookie"];

    if (!cookies) {
      return;
    }

    // Go through all new cookies
    cookies.forEach(cookie => {
      const name = cookie.split("=")[0].trim();
      const value = cookie
        .split("=")[1]
        .split(";")[0]
        .trim();
      const expires = new Date(
        cookie
          .split("expires=")[1]
          .split(";")[0]
          .trim()
      ).valueOf();
      const oldCookie = this.cookies.find(c => c.name === name);

      if (oldCookie) {
        oldCookie.value = value;
        oldCookie.expires = expires;
      } else {
        this.cookies.push({
          name,
          value,
          expires,
        });
      }
    });
  };
}

export default WebLoginManager;
