function Welcome({setPlayerName, setRound}) {
    let playerName = '';

    const handleInputChange = event => {
        playerName = event.target.value;
    }

    return (
        <div>
            <h3>Welcome to Jeopardy!</h3>
            Enter Your Name: <input defaultValue={playerName} onChange={handleInputChange}></input>
            <button onClick={() => {setPlayerName(playerName); setRound(1)}}>Submit</button>
        </div>
    );
}

export default Welcome;