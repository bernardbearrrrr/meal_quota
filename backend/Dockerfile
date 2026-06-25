# Gunakan image PHP resmi
FROM php:8.3-fpm

# Install dependencies sistem
RUN apt-get update && apt-get install -y \
    libpng-dev libjpeg-dev libfreetype6-dev libgd-dev zip git unzip \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install pdo pdo_mysql gd

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install Node.js untuk Vite
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs

# Copy file proyek
WORKDIR /var/www
COPY . .

# Jalankan instalasi
RUN composer install --no-dev --optimize-autoloader
RUN npm install && npm run build

# Port
EXPOSE 8080

# Jalankan server
CMD php artisan serve --host=0.0.0.0 --port=$PORT