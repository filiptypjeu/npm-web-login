# web-login-manager
Package for logging into basic websites. Can handle `csrfmiddlewaretoken` in login forms, all cookies on the site (for example `csrftoken` and `sessionid` cookies). The class instance will store, use and update cookies automatically.

## Usage
```ts
const app = new WebLoginManager({
      baseURL: "https://myapp.com",
      username: "myusername",
      password: "mysecurepassword",
      loginPath: "/login/",
      sessionidCookieName: "sessionid",
      middlewaretokenName: "csrfmiddlewaretoken",
});
await app.fetch("/my/path?q=keyword");
```
