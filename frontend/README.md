
THIS IS ALL FALSE INFORMATION NOW!!




# The Setup Guide
### Prerequisites
- A domain this site will be hosted on. (we reccomend buying them directly from [cloudflare](https://domains.cloudflare.com/))
- An up to date MySQL database (you may be able to get one from your hosting provider).
- Hosting for discord bot (bun.sh).
- Hosting for website, setup guide shows the proccess of using [Vercel](https://vercel.com/).

### Understandings
- If an instruction in this list reccomends you to go to `/src/app/` - this means go to the `src` folder, and the `app` folder within, for example -> [see image](https://cdn.mrddd.xyz/img/2025/explorer_RVpdLJs08t)
- If the instruction ends with a file extension, for example `/prisma/seed.js` -> `.js` - this means go to the `prisma` folder, and the `seed.js` **file** within, for example -> [see image](https://cdn.mrddd.xyz/img/2025/explorer_UR377V8Pc5)

## 1. Managing the Files Locally
- You can ignore this step if you know what you're doing.
- [Visual Studio Code](https://code.visualstudio.com/) is highly reccomend for managing the file, and is free.
- We reccomend use [Git Hub Desktop](https://desktop.github.com/download/) to upload and manage the files on git hub.

## 2. Changing the Images
### Manual Option
#### The logo and Background Images
- Navigate to `/public/images` and you will see `logo.png` and `background.jpg`, delete them. For example -> [see image](https://cdn.mrddd.xyz/img/2025/explorer_8AvI73eJr6)
- Transfer your logo over while making sure to keep the name `logo.png`. (We reccomend a version of your logo with no background.)
- Transfer your banner over while making sure to keep the name `background.jpg`. (We reccomend using a 1920 x 1080 resolution.)

#### The Favicon (the [icon](https://cdn.mrddd.xyz/img/2025/brave_eDvQHWHecK) you see on the top of your browser)
- Navigate to `/src/app/` and you will see favicon.ico, delete it.
- Visit [Favicon.io](https://favicon.io/favicon-converter/) and make a favicon if, you do not have one already. Inside this website you can upload the same logo file you used.
- Extract the .zip and **only** transfer over the favicon.ico (may show as just "favicon") file by itself into `src/app/`.
- **Done with the images.**

### Theme Editor
- You can do this all via the theme editor, once you have setup the rest of the site. It is explained in the on site configuration docs.

## 3. Getting admin privileges (ADMIN)
- Navigate to `/prisma/seed.js` place your steam64id under `STEP ADMIN.1.` (you will need to scroll down.) -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_0iG5eDokJ0)
- You can get your steam64id -> [here](http://steamid.io/) -> [see image](https://cdn.mrddd.xyz/img/2025/brave_4h2IkLr8wA).
- The details here (except ownerid) can be configured on the websites admin panel at any time, and will be shown later in the setup proccess.
- **Done with admin priviledges.**

## 4. Environment Variables
- Find the `.env.example` file, and rename it to just `.env`. It should look like -> [this](https://cdn.mrddd.xyz/img/2025/explorer_pyLjtWnhsk)
- Open it and put it to the side, you will need it for the rest of these steps.

### 4.1. Discord Bot (DISC)
#### Creating the Bot
- Head over to [Discord Applications](https://discord.com/developers/applications) and press "New Application".
- Any name is okay, we'd reccomend using "YourServerName Website".
- Once created put your logo on it -> [see image](https://cdn.mrddd.xyz/img/2025/brave_eaUk7AKknh).
- Press on **Bot** on the left hand side of the page, you can keep the username the same, we reccomend changing it to "Linking Bot" as this is how it will display on your discord server, and on your website linking it will show as the name you set in the previous step.
- You'll see an option for Token (you might have to reset it) then copy it and paste it into your `.env` file under `STEP DISC.1.` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_6fykT9vWDV)
- Scroll down to see Privileged Gateway Intents, enable all 3 of them -> [see image for both](https://cdn.mrddd.xyz/img/2025/brave_8PzZpAFQwU)

#### Second part for the Bot
- Now move to **OAuth2**, and copy the Client ID and paste it into your `.env` file under `STEP DISC.2.` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_m2vYROSfeF)
- Also copy the Client Secret and paste it into your `.env` file under `STEP DISC.3.` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_LSVi4Qr6j1)
- If you can't find these on discord applications -> [see image](https://cdn.mrddd.xyz/img/2025/brave_jWNLMAPj46)
- Go to Redirects, press "add redirect" and enter the following URL, **modify it** to use your domain: `https://yourDomain.com/api/auth/callback/discord`
- Go to OAuth2 URL Generator, select `bot`, `application.commands`, `guilds.join` for scopes, and scroll down a little to permissions and select `Manage Roles`, `Manage Nicknames`, `Create Instant Invite`, `View Channels`, `Send Messages` -> [see image](https://cdn.mrddd.xyz/img/2025/UImEOEgqGl)
- `guilds.join` is required so the website can add users to your Discord server when they link. The bot also needs `Create Instant Invite` for that to work.
- Copy the link and put it into another tab to invite the bot to your Discord Server.
- **Done with the discord bot.**

### 4.2. Getting a Database URL (DB)
- If you're using a game hosting provider which uses pterodactyl (it looks similar to -> [see image](https://cdn.mrddd.xyz/img/2025/brave_906mtWnMZi)) you can follow the next step, if not ignore it.

#### If you're using Pterodactyl Databases // *some* game hosting providers.
- Go into the databases page, create a database, you can name it whatever you'd like and safely ignore the `Connections from` section, similar to -> [see image](https://cdn.mrddd.xyz/img/2025/brave_pv3rxKgjrV)
- When you have created the database, press the [view button](https://cdn.mrddd.xyz/img/2025/brave_MM7TBKgaC7) and copy the string at the bottom, it will look similar to -> [see image](https://cdn.mrddd.xyz/img/2025/brave_tyro4ElROi)
- Paste the string into your `.env` file under `STEP DB.1.` - if you have `jdbc:` at the start of the string, [remove it](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_hIIuiYRuPh) - it should look like -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_EHKEUPaNyK)

#### If you're using an alternative database hosting method.
- Follow the format `mysql://user:pass@hostIP:3306/databaseName` and place it into the `.env` file under `STEP DB.1.`.
- **Done with the Database URL.**

### 4.3. PayNow (PN)
#### Setting up PayNow for the first time
- You can disregard this step if you already have a store created.
- Go to the [PayNow Dashboard](https://dashboard.paynow.gg/), and press "Create a Store", you can name it however you'd like, use your prefered currency and slug.
- Choose "Rust" for the Platform, and select "Headless API" for the integration type.
- For the Website URL enter the following URL, **modify it** to use your domain: `https://yourDomain.com/`, then press Create Store -> [see image](https://cdn.mrddd.xyz/img/2025/brave_BANBKJs5VZ)
- You can continue the rest of the setup process and product creation on paynow and come back to this, or do it later.

#### Getting a PayNow API Key
- Go to your [PayNow Dashboard](https://dashboard.paynow.gg/roles) and find the Roles tab (under Access). Create a new role called "Website" and give it the following permissions.
- `View Products`, `Customers` (all), `Order` (all), `Subscription` (all), `View Coupons`, `View Tags`, `View Sale`, `View Webstore`, `View Giftcards`, `View Bans`.
- Then go to [API Keys](https://dashboard.paynow.gg/api-keys) and name it Website, and give it the website role. Then press create -> [see image](https://cdn.mrddd.xyz/img/2025/brave_iDX1S48fJt)
- Copy the API Key and paste it into your `.env` file under `STEP PN.1.` **AND** `STEP PN.2.` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_3bIgW0uKUN)
- Copy the ID at the top of the page under General and go to `prisma/seed.js` and paste it under `STEP PN.3.` (you will need to scroll down.) -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_n7UHrHEhjn)
- **Done with PayNow.**

### 4.4. Setting up NEXTAUTH SECRET (NAUTH)
- If you have issues with the following commands, [make sure you have node.js installed](https://nodejs.org/en/download) using the `Windows Installer (.msi)`, if you're unsure, reinstallation is harmless.
- Within your the web template folder on your PC and right click and press [Open in Terminal](https://cdn.mrddd.xyz/img/2025/explorer_QncYWazAi5).
- Run the following command: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` -> [see image](https://cdn.mrddd.xyz/img/2025/WindowsTerminal_jaFTfK2meF)
- Paste the key into your `.env` file under `STEP NAUTH.1.` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_dkySOVmsNz)
- **Done with NEXTAUTH.**

### 4.5. Cloudflare R2 (CF)
#### Setting up a Cloudflare R2 Bucket
- You are not required to do this step, if you choose not to go into your `.env` file under `STEP CF.1.` and set it to false, and remove the variables instructed -> [before](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_3rt8qGo2km) -> [after](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_iuV7Sc4mZM)
- This is used to allow files to be uploaded inside of support tickets and for your image hosting CDN, you get [10GB for free](https://developers.cloudflare.com/r2/pricing/) on Cloudflare (which should be plenty).
- Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and sign in, then navigate to R2 Object Storage under Storage and Databases -> [see image](https://cdn.mrddd.xyz/img/2025/brave_g1WSrt0ZfT)|
- Press Create bucket, you will need to attach your card.
- You can use any name, the location can be changed, but keep the storage class to standard, then Create Bucket. -> [see image](https://cdn.mrddd.xyz/img/2025/brave_3G80Psdpgg)
- Paste the bucket name you chose into your `.env` file under `STEP CF.2.` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_FfWHHGUwkX)
- Once you have pressed create bucket, go to the Settings Page -> [see image](https://cdn.mrddd.xyz/img/2025/brave_FiEuoOEVte) - and look for "Custom Domains", set the custom domain to `cdn.yourDomain.com` then press continue and then connect -> [see image](https://cdn.mrddd.xyz/img/2025/brave_fUT01KG3U3)

#### Cloudflare R2 API setup
- Go back to the main settings by pressing "R2 Object Storage" in the top left -> [see image](https://cdn.mrddd.xyz/img/2025/brave_iZz7GJNMws)
- Copy the Account ID and paste it in your `.env` file under `STEP CF.3.` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_vqI5Ta4Ghl)
- If you can't find Account ID -> [see image](https://cdn.mrddd.xyz/img/2025/brave_J2l2QcsrT4)
- In your `.env` file under `STEP CF.4.` set it to `cdn.yourDomain.com` or the URL you used in the second last step. 

#### Creating a Cloudflare API Token
- Press on the [`{} Manage`](https://cdn.mrddd.xyz/img/2025/brave_R44DZrNT6K) button, create Account API Token -> [see image](https://cdn.mrddd.xyz/img/2025/brave_b5F8YC8S7U)
- You can name it however you'd like (it wont be needed for the env variables.) Select Admin Read & Write, leave the rest of the options default, then press Create Account API Token -> [see image](https://cdn.mrddd.xyz/img/2025/YFR1I1Z7Zt)
- Ignore the Token value and you should see Access Key ID and Secret Access Key -> [see image](https://cdn.mrddd.xyz/img/2025/brave_KrfZOLxHmd)
- Copy the Access Key ID and paste it into your `.env` file under `STEP CF.5.` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_S1PGWEHp3y)
- Also copy the Secret Access Key and paste it into your `.env` file under `STEP CF.6.` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_0Rk2VHmsVb)
- Make sure you press Finish at the bottom of the page on Cloudflare -> [see image](https://cdn.mrddd.xyz/img/2025/brave_8RkbdukEfF)

#### NEXT Config MJS
- You will need to add an additiional section within this file to support your custom domain.
- Copy the following code:
```ts
            {
                hostname: 'cdn.yourDomain.com',
                protocol: 'https',
            },
```
- Paste this right after `pub-2f3824dd26d6443e9775afc14efa5de1.r2.dev` in the file -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_t4WQVt38gn)
- **Done with Cloudflare R2.**

### 4.6. Creating a VirusTotal API Key (VRT)
#### The virus scanning features
- Scan uploaded files for malware and viruses.
- Block malicious files from being uploaded.
- Provide detailed scan results including detection rates.
- *NOTE: The free tier of VirusTotal API has rate limits - but in our testing we have not needed to pay for it.*
- If you do not want to use Virus Total, you can leave it blank (**don't remove the variable** -> [see image]([https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_MeCLjzmnAx](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_jCBoTKnfT8))

#### Enabling virus scanning features
- To enable virus scanning functionality, you need to obtain an API key from VirusTotal.
- Visit [Virus Total](https://www.virustotal.com/) and sign up -> [see image](https://cdn.mrddd.xyz/img/2025/brave_gElVVkHXbo)
- You'll be directed back to the home page after, press on your username and press API Key -> [see image](https://cdn.mrddd.xyz/img/2025/brave_d6JTHrcasa)
- Copy the API key (it will be blurred on site, that's okay) -> [see image](https://cdn.mrddd.xyz/img/2025/brave_yUvdpmBa1v)
- Paste it into your `.env` file under `STEP VRT.1.` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_m1RHMLO9Co)
- **Done with Virus Total.**

### 4.7. Other External API Keys
#### Steam API Key (STEAM)
- Go to the [Steam Developers](https://steamcommunity.com/dev), sign in if you are not -> [see image](https://cdn.mrddd.xyz/img/2025/brave_oFfNqbCqWB)
- Press "by filling out this form" and complete it -> [see image](https://cdn.mrddd.xyz/img/2025/brave_64BQ8VAQvR)
- Set the domain to your one, without `https://`, then copy the Key -> [see image](https://cdn.mrddd.xyz/img/2025/brave_FpyyyYBstX)
- Paste it into your `.env` file under `STEP STEAM.1.` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_ZIh7W8D7jx)
- **Done with Steam API Key.**

#### Rust Maps API Key (RM)
- This is for map voting on site, you can leave it blank (**don't remove the variable** -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_MeCLjzmnAx)) if you do not want to use rustmaps, however you will need to have Cloudflare R2 Setup for map voting instead.
- Go to [Rust Maps](https://rustmaps.com/dashboard) and sign in with steam.
- Copy the API Key -> [see image](https://cdn.mrddd.xyz/img/2025/brave_ZG5klYQY9h)
- Paste it into your `.env` file under `STEP RM.1.` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_OCqPq4gYAs)
- **Done with Rust Maps.**

### 4.8. Final Environment Variables (FEV)
- In your `.env` file under `STEP FEV.1.` paste your domain with**out** `https://` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_20xH8jCN8r)
- Under `STEP FEV.2.` paste your domain **with** `https://` -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_krPBW5PSwT)
- It should look like this -> [see image](https://cdn.mrddd.xyz/img/2025/notepad%2B%2B_otrjSbgjG4)   

### Done with Environment Variables.
- You can close your `.env` file now.

## 5. Initializing the Database
- Within your the web template folder on your PC and right click and press [Open in Terminal](https://cdn.mrddd.xyz/img/2025/explorer_QncYWazAi5) - you **can** use the pre existing terminal if you have not closed it yet.
- Run the following commands in this order `npm install` (*this may a minute*), `npx prisma db push`, and `node prisma/seed.js`.
- If you have issues with the following commands, open [Windows Powershell as an Administrator](https://cdn.mrddd.xyz/img/2025/brave_6US8wTRNUZ), and run the following command. `Set-ExecutionPolicy -ExecutionPolicy Unrestricted` and select `Y`.
- Then close powershell and your terminal, then open just the terminal again within the folder, as shown previously.
- **Done with database initialization.**

## 6. Git Hub
#### Creating a repository
- The easiest way to do this is with the [Git Hub Desktop](https://desktop.github.com/download/) app, the documentation will follow a proccess of using this app, feel free to use your own methods.
- Once you have downloaded the app, installed it and signed in, press [New Repository](https://cdn.mrddd.xyz/img/2025/GitHubDesktop_8GF2lRPtGX), you can name this repository whatever you'd like.
- You can ignore the description and change the local path to anywhere on your PC (**not** the folder you have been working through so far though) -> [see image](https://cdn.mrddd.xyz/img/2025/GitHubDesktop_OTt0z3zoE7)
- Press [show in explorer](https://cdn.mrddd.xyz/img/2025/GitHubDesktop_OUbjsgTwBu) and you should now have 2 file explorer tabs open, if not open up your original website template folder on a new tab.
- You should place them side by side like this -> [see image](https://cdn.mrddd.xyz/img/2025/explorer_0qThZowWBr)
- Now drag over everything from the original folder into the new one (the full folder into the mostly empty one) -> [see image](https://cdn.mrddd.xyz/img/2025/explorer_mHT7aXD28g)
- You can now close the original and now empty folder.

#### Pushing the files to the repository (come back to here when you update anything in the future)
- Your Github Desktop app should now look like this -> [see image](https://cdn.mrddd.xyz/img/2025/GitHubDesktop_zgfV6W7TV2)
- Under summary type "initial" and then commit files to main -> [see image](https://cdn.mrddd.xyz/img/2025/GitHubDesktop_uEwtEFI7s3)
- Once complete it will look like this -> [see image](https://cdn.mrddd.xyz/img/2025/GitHubDesktop_XAjL6o2bqI)
- Press the Publish repository highlighted in the previous image. **Make sure Keep this code private is ticked!** -> [see image](https://cdn.mrddd.xyz/img/2025/GitHubDesktop_I3BmCRUZ0T)
- Press Publish repository again (it might take a minute) -> [see image](https://cdn.mrddd.xyz/img/2025/GitHubDesktop_sIqbSvAENU)
- **Done with Git Hub.**

## 7. Vercel
#### Connecting your Repository to Vercel
- Sign up to [Vercel.app](https://vercel.app/) choose a hobby account (it's free) and put your name in.
- Then press Continue with GitHub and sign in.
- You will now see Import Git Repository press install. Select your account, then choose only select repositories, and finally choose the repo you made at the start of this process. Then press install again.
- Now press the "Import" button next to your repository on vercel -> [see image](https://cdn.mrddd.xyz/img/2025/brave_IFxb1EqBR1)
- Find Build and Output Settings you'll see Build Command, press the switch next to it, and change it to `prisma generate && next build` -> [see image](https://cdn.mrddd.xyz/img/2025/brave_z4DSdJGLL9)
- Do **not** press Deploy yet.

#### Adding your Enviornment Variables to Vercel
- Open your `.env` file and copy the entire contents of the file, including the text after a #. (You can use CNTRL A within the file to do this.)
- Paste what you have copied into the `EXAMPLE_NAME` variable, vercel will format the rest automatically -> [see image](https://cdn.mrddd.xyz/img/2025/mhT6IsFQwg)
- Now press Deploy, it will take about ~2.5 minutes to build.
- Once it's complete press Continue to Dashboard -> [see image](https://cdn.mrddd.xyz/img/2025/brave_CRVm26rbe2)

#### Setting up your domain on Vercel
- Go to the Settings tab of your Vercel project -> [see image](https://cdn.mrddd.xyz/img/2025/brave_j3NAms3WRc)
- You will see [Domains](https://cdn.mrddd.xyz/img/2025/brave_cHeJP73vnF) on the left, press Add Domain and enter the following URL, **modify it** to use your domain: `yourDomain.com`.
- Uncheck Redirect `yourDomain.com` to `www.yourDomain.com` -> [see image](https://cdn.mrddd.xyz/img/2025/brave_aL6xdaW2uC)
- Once you have saved choose the configure automatically option, if it shows Invalid Configuration, press the red text and press configure automatically from there -> [see image](https://cdn.mrddd.xyz/img/2025/brave_cc6HTR2Ejf)
- It may take some time for this to apply, so in the meantime move to the next step.

#### Changing where Vercel hosts the site.
- Go to the Functions tab on the left and find the Function Region inside of the page -> [see image](https://cdn.mrddd.xyz/img/2025/brave_tRED5cpm7G)
- This is where you can change the location, **make sure to unselect the old location.**
- When you're choose a location, choose the location that is **closest to your database NOT closest to you.**
- Once you press Save it will prompt you to Redeploy, please do this -> [see image](https://cdn.mrddd.xyz/img/2025/brave_1DneTlb2Xd)
- **Done with Vercel.**

## 8. Setting up the Website on site
- You're finally ready to configure the rest on the website!
- Once Vercel has built the site again (~2.5 minutes) navigate to `yourDomain.com` on your browser (chrome, firefox, edge, brave).
- Sign in with steam on the top right -> [see image](https://cdn.mrddd.xyz/img/2025/brave_0oiok6LqRO)
- Once siged in go to the [admin dashboard](https://cdn.mrddd.xyz/img/2025/brave_TNMYd4Bs9d) from here move onto the other documentation provided.

## Finished!
- If you do any further editing to the template, all you need to do is open Github Desktop, commit the update and push origin again. Vercel will build it automatically. (Follow step: 6 again.)
