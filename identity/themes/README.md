# Update UTM theme into k8s deployment
According to the guideline of theme deployment from Keycloak https://www.keycloak.org/docs/latest/server_development/#deploying-themes

Below is steps to create a jar file the theme folder and update to k8s deployment folder

- Go to `utm` folder
```shell
cd utm
```
- Run the jar command line to create a jar file
```shell
jar cvf utm.jar *
```
- Copy `utm.jar` file to `k8s/deploy/keycloak/themes` folder