function Name({loadBoard}) {
    let playerName = '';

    const handleInputChange = event => {
        playerName = event.target.value;
    }

    return (
        <form className='center-screen' onSubmit={() => {loadBoard(playerName)}}>    
            <b>Enter your name:</b>
            <input defaultValue={playerName} onChange={handleInputChange}></input>
            <button type="submit">Submit</button>                   
        </form>
    );
}

export default Name;