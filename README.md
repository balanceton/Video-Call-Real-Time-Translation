# Cross-language Audio Video Conferencing

This application is a cross-language audio-video conferencing application that allows people speaking different languages to communicate better.

---

## How to Run the Application

### Step 1: Run the Google Colab Pipeline
1. Open the Colab pipeline from the following link: [Colab Link](https://colab.research.google.com/drive/1n1uKyBvvsQwQboAhg9PAkE3hMKPsJexi?usp=sharing)

2. Run the pipeline in Colab.
3. Once the pipeline finishes running, store the URL provided by ngrok in the output of the last code block.

   Example:
   ```
   https://6392-34-13-145-187.ngrok-free.app
   ```

### Step 2: Set Up the React Project
1. Download the React project provided in the shared drive.
2. Open the `app.js` file in the React project and update the following code block with the ngrok URL obtained in Step 1:

   ```javascript
   const response = await fetch(
       "https://08ee-35-240-167-236.ngrok-free.app/process_video/",
       {
         method: "POST",
         body: formData,
         mode: "cors",
       }
   );
   ```

3. Replace the URL with your own ngrok URL.


### Step 3: Install Dependencies for Backend
1. Open a terminal in the main project directory.
2. Run the following command to install the required backend packages:
   ```powershell
   npm install
   ```
3. If any issues arise, run:
   ```powershell
   npm audit fix
   ```

### Step 4: Install Dependencies for Frontend
1. Open a new terminal.
2. Navigate to the `frontend` directory:
   ```powershell
   cd frontend
   ```
3. Install the required frontend packages:
   ```powershell
   npm install
   ```
4. If any issues arise, run:
   ```powershell
   npm audit fix
   ```




### Step 6: Start the Backend
1. In the main project directory, run the following command to start the backend:
   ```powershell
   npm run dev
   ```

### Step 7: Start the Frontend
1. In the terminal where the `frontend` directory is open, run:
   ```powershell
   yarn start
   ```

### Step 8: Start demo
1. Demo is ready now. Open the "localhost:3000" in two different tabs now.
2. Enter names for both tabs. Select target languaeg. Then copy the id for one them and call them from other one.




