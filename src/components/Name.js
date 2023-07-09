function Name({startRound}) {
    let playerName = '';

    const handleInputChange = event => {
        playerName = event.target.value;
    }

    return (
        <div class='center-screen'>
            <b>Enter your name:</b> <input defaultValue={playerName} onChange={handleInputChange}></input>
            <button onClick={() => {startRound(0, playerName)}}>Submit</button>
        </div>
    );
}

export default Name;