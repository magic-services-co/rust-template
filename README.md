# Rust Template (production distribution)

This tree contains the **ionCube-encoded** Laravel backend and the **unencoded** Next.js frontend.

## Requirements

- **PHP 8.2+** with Laravel extensions and **[ionCube Loader](https://get-loader.ioncube.com)** for the same PHP major/minor used at encode time (this build used the Encoder’s PHP 8.3 target).
- **Node.js 20+** for the frontend.
- **MySQL** (or compatible).

## Blade templates

`.blade.php` files are shipped as **plain source** so Laravel can compile views. Other application PHP is ionCube-encoded.

## Re-run the build

From the **private** source repository:

`./scripts/build-ioncube-prod.sh`

## Migrating from the old Rust Template

Use the site **/setup** wizard (“Previous install” step) to copy data from an older MySQL database of this template into the target database.
