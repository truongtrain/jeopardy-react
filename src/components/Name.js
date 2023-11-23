function Name({loadBoard}) {
    let playerName = '';

    const handleInputChange = event => {
        playerName = event.target.value;
    }

    return (
        <div className='center-screen'>    
            <b>Enter your name:</b>
            <input defaultValue={playerName} onChange={handleInputChange}></input>
            <button onClick={() => {loadBoard(playerName)}}>Submit</button>                   
        </div>
    );
}

export default Name;