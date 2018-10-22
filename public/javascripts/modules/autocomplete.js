function autocomplete (input, latInput, lngInput) {
	if(!input) return; // skip this fn from running if there is not input on the page
	const dropdown = new google.maps.places.Autocomplete(input);

	dropdown.addListener('place_changed', () =>{
		const place = dropdown.getPlace()
		console.log(place)
		latInput = place.geometry.location.lat()
		lngInput = place.geometry.location.lng()
	})
	//if someone hits enter in the address field, don't submit the from
	input.on('keydown', (e) =>{
		if(e.keyCode === 13){
			e.preventDefault;
		}
	})
}

export default autocomplete