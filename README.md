# Sitios Estáticos
Esqueleto e inicio rápido de sitios estáticos con 'livereload', compilación de sass y templates
(no se usa ningún framework)

## Características
* Compila SASS
* Revisa el código JS en busca de errores
* Utiliza templates HTML para armar páginas
* Levanta un servidor de desarrollo con proxy para conectarse a una API
* Espera cambios en los archivos de desarrollo y actualiza automáticamente el navegador

## Tecnología Usada
* [gulp](http://gulpjs.com/) - Build engine
* [jshint](http://www.jshint.com/) - Revisa código JavaScript
* [uglify](https://github.com/mishoo/UglifyJS2/) - Minifica JavaScript
* [sass](http://sass-lang.com/) - CSS preprocessor
* [browser-sync](https://www.browsersync.io/) - Servidor HTTP

## Tasks
```sh
# Crea archivos listos para producción, con revisión de código,
# "uglificados" y "minificados" (los archivos se crean archivos en ./build)
gulp build

# Analiza y concatena modulos instalados con bower (vendor.js)
# Inyecta dependencias en los archivos html anotados en `./src/*.html` (gulp-inject)
# Inicia un servidor HTTP de desarrollo en http://localhost:8000 y espera cambios
gulp server

```

## Uso
Requiere tener instalado NodeJS y NPM
```sh
# Si no has usado/instalado gulp:
sudo npm install -g gulp bower

# Instala dependencias de gulp y el proyecto
npm install

# Instala dependecnias Web
bower install

# Ejecuta una tarea de gulp.
gulp server
```

### Estructura de /src
* .tmp/ - Directorio generado con archivos de desarrollo (al ejecutar `gulp server`)
* build/ - Directorio con la aplicación lista para producción (al ejecutar `gulp`)
* sass/ - Archivos en sass
* src/ - Directorio donde la aplicación _vive_
    * index.html - Página principal
    * other.html - Otras páginas "sección"
    * assets/ - Multimedia
    * templates/ - Parciales html
        * module/ - Un componente de la aplicación
            * *.js - Controladores, servicios, fabricas del componente
            * *.tpl.html - Fragmentos o templates HTML del componente (serán convertidos a JS e inyectados en el templateProvider)
* vendor/ - Modulos web (instalados con bower)
* .bowerrc - Cambia el directorio por default para instalar dependencias vía bower
* bower.json - Dependencias Web
* gulpfile.js - Configuración de gulp
* package.json - Configuración del proyecto y dependencias NodeJS