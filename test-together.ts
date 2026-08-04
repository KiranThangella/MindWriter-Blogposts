async function test() {
  const url = "https://api.together.xyz/v1/images/generations";
  const res = await fetch(url, { 
      method: "POST", 
      headers: { "Content-Type": "application/json", "Authorization": "Bearer fake_key" },
      body: JSON.stringify({ 
          model: "black-forest-labs/FLUX.1-schnell",
          prompt: "cat" 
      }) 
  });
  console.log(res.status, res.statusText);
  console.log(await res.text());
}
test();
