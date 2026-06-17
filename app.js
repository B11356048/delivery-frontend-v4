const API = "http://localhost:3000"; // 依你的實際後端網址或部署位置調整

let currentUser = null;
let cart = [];

window.onload = () => {
    changeRegisterRole();
    const user = localStorage.getItem("user");
    if(user){
        currentUser = JSON.parse(user);
        showRolePage();
    }
};

/* ===================== 認證功能 ===================== */
async function registerUser(){
    try{
        const body = {
            role: document.getElementById("regRole").value,
            username: document.getElementById("regUser").value,
            password: document.getElementById("regPass").value,
            name: document.getElementById("regName").value,
            phone: document.getElementById("regPhone").value,
            address: document.getElementById("regAddress").value,
            storeName: document.getElementById("regStoreName").value || "",
            taxId: document.getElementById("regTaxId").value || "",
            businessProofImg: document.getElementById("regBusinessProof").value || "",
            licenseType: document.getElementById("regLicenseType").value || "",
            licenseNumber: document.getElementById("regLicenseNumber").value || "",
            insuranceImg: document.getElementById("regInsuranceImg").value || ""
        };

        const res = await fetch(API + "/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        alert(data.message);
    } catch(err){
        alert(err.message);
    }
}

async function login(){
    try{
        const res = await fetch(API + "/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: document.getElementById("loginUser").value,
                password: document.getElementById("loginPass").value
            })
        });
        const data = await res.json();
        if(!data.success){
            alert(data.message);
            return;
        }
        currentUser = data.user;
        localStorage.setItem("user", JSON.stringify(data.user));
        showRolePage();
    } catch(err){
        alert(err.message);
    }
}

function logout(){
    localStorage.removeItem("user");
    currentUser = null;
    location.reload();
}

function showRolePage(){
    document.getElementById("auth").style.display = "none";
    if(currentUser.role === "customer"){
        document.getElementById("customer").classList.remove("hidden");
        loadFoods();
        loadMyOrders();
    }
    if(currentUser.role === "merchant"){
        document.getElementById("merchant").classList.remove("hidden");
        loadMerchantFoods();
        loadMerchantOrders();
    }
    if(currentUser.role === "rider"){
        document.getElementById("rider").classList.remove("hidden");
        loadAvailableOrders();
        loadRiderOrders(); 
    }
}

/* ===================== 消費者專區 ===================== */
async function loadFoods(){
    const res = await fetch(API + "/api/foods");
    const data = await res.json();
    const foods = document.getElementById("foods");
    foods.innerHTML = "";

    data.data.forEach(food => {
        const avg = food.ratingCount && food.ratingCount > 0 ? (food.ratingSum / food.ratingCount).toFixed(1) : "新上市";
        foods.innerHTML += `
        <div class="food-card">
            <img src="${food.image || ''}" style="width:100px; height:100px;">
            <h3>${food.name}</h3>
            <p>$${food.price}</p>
            <p>商家：${food.storeName || '合作店家'}</p>
            <p>⭐ ${avg}</p>
            <button onclick="addToCart('${food._id}')">加入購物車</button>
        </div>`;
    });
}

async function addToCart(foodId){
    const res = await fetch(API + "/api/foods");
    const data = await res.json();
    const food = data.data.find(f => f._id === foodId);

    const existing = cart.find(c => c.foodId === foodId);
    if(existing){
        existing.qty++;
    } else {
        cart.push({
            foodId: food._id,
            name: food.name,
            price: food.price,
            qty: 1,
            image: food.image,
            storeId: food.storeId,       // 補丁帶入
            storeName: food.storeName    // 補丁帶入
        });
    }
    renderCart();
}

function renderCart(){
    const cartDiv = document.getElementById("cart");
    if(!cartDiv) return;
    let html = "";
    let total = 0;
    cart.forEach(item => {
        total += item.price * item.qty;
        html += `<div>${item.name} x ${item.qty} = $${item.price * item.qty}</div>`;
    });
    html += `<h3>總金額：${total}</h3><button onclick="createOrder()">確認送出訂單</button>`;
    cartDiv.innerHTML = html;
}

async function createOrder(){
    if(cart.length === 0) return alert("購物車空空的喔");
    const paymentMethod = prompt("付款方式：填寫 cash (現金) 或 online (線上)");
    if(paymentMethod !== "cash" && paymentMethod !== "online") return alert("輸入錯誤");

    let totalAmount = 0;
    cart.forEach(item => { totalAmount += item.price * item.qty; });

    const body = {
        memberId: currentUser._id,
        memberName: currentUser.name || currentUser.username,
        memberEmail: currentUser.username,
        phone: currentUser.phone || "0912345678",
        address: currentUser.address || "預設測試地址",
        merchantId: cart[0].storeId,   // 完美對齊後端
        storeName: cart[0].storeName,   // 完美對齊後端
        items: cart,
        totalAmount,
        paymentMethod
    };

    const res = await fetch(API + "/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if(data.success){
        alert("下單成功！" + (data.data.deliveryCode ? `\n線上外送驗證碼: 【${data.data.deliveryCode}】` : ""));
        cart = [];
        renderCart();
        loadMyOrders();
    }
}

async function loadMyOrders(){
    const res = await fetch(API + "/api/orders/user/" + currentUser._id);
    const data = await res.json();
    let html = "";
    data.data.forEach(order => {
        html += `<div><h4>單號：${order.orderNumber}</h4><p>店家：${order.storeName} | 狀態：<b>${order.status}</b></p><p>金額：$${order.totalAmount}</p>${order.status === "已送達" && !order.reviewed ? `<button onclick="reviewOrder('${order._id}')">撰寫滿意度評價</button>` : ""}</div><hr>`;
    });
    document.getElementById("myOrders").innerHTML = html || "暫無訂單";
}

async function reviewOrder(orderId){
    const stars = prompt("請輸入評分星數 (1 ~ 5):");
    const comment = prompt("請輸入心得：");
    if(!stars) return;
    await fetch(API + `/api/orders/${orderId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser._id, userName: currentUser.name || currentUser.username, stars: Number(stars), comment })
    });
    alert("評價完成！");
    loadMyOrders();
}

/* ===================== 店家專區 ===================== */
async function addFood(){
    const body = {
        storeId: currentUser._id,
        storeName: currentUser.storeName || currentUser.name,
        name: document.getElementById("foodName").value,
        price: Number(document.getElementById("foodPrice").value),
        stock: 99,
        image: ""
    };
    await fetch(API + "/api/foods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    alert("上架成功");
    loadMerchantFoods();
}

async function loadMerchantFoods(){
    const res = await fetch(API + "/api/foods/store/" + currentUser._id);
    const data = await res.json();
    let html = "";
    data.data.forEach(food => { html += `<div><b>${food.name}</b> | $${food.price}</div>`; });
    document.getElementById("merchantFoods").innerHTML = html || "無商品";
}

async function loadMerchantOrders(){
    const res = await fetch(API + "/api/orders/store/" + currentUser._id);
    const data = await res.json();
    let html = "";
    data.data.forEach(order => {
        html += `<div><p>單號: ${order.orderNumber} | 狀態: <b>${order.status}</b></p><p>金額: $${order.totalAmount}</p>${order.status === "待店家接單" ? `<button onclick="acceptOrder('${order._id}')">接受訂單並開始製作</button>` : ""}</div><hr>`;
    });
    document.getElementById("merchantOrders").innerHTML = html || "無新訂單";
}

async function acceptOrder(id){
    await fetch(API + `/api/orders/${id}/accept`, { method: "PUT" });
    alert("已接單，正在排單製作！");
    loadMerchantOrders();
}

/* ===================== 騎手專區 ===================== */
async function loadAvailableOrders(){
    const res = await fetch(API + "/api/orders/available");
    const data = await res.json();
    let html = "";
    data.data.forEach(order => {
        html += `<div><p>外送地址: <b>${order.address}</b></p><p>配送費用: $${order.totalAmount}</p><button onclick="assignRider('${order._id}')">接單搶單</button></div><hr>`;
    });
    document.getElementById("availableOrders").innerHTML = html || "大廳目前無待接訂單";
}

async function assignRider(orderId){
    const res = await fetch(API + `/api/orders/${orderId}/assign-rider`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId: currentUser._id, riderName: currentUser.name || currentUser.username })
    });
    const data = await res.json();
    alert(data.message);
    loadAvailableOrders();
    loadRiderOrders();
}

async function loadRiderOrders(){
    const res = await fetch(API + "/api/orders/rider/" + currentUser._id);
    const data = await res.json();
    let html = "";
    data.data.forEach(order => {
        html += `<div><p><b>單號：${order.orderNumber}</b></p><p>送往：${order.address}</p><button onclick="completeOrder('${order._id}', '${order.paymentMethod}')">確認送達並結案</button></div><hr>`;
    });
    document.getElementById("riderOrders").innerHTML = html || "目前無配送中任務";
}

async function completeOrder(orderId, paymentMethod){
    let inputCode = "";
    if(paymentMethod === "online"){
        inputCode = prompt("線上單，請輸入客戶提供的4位數驗證碼：");
        if(!inputCode) return;
    }
    const res = await fetch(API + `/api/orders/${orderId}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputCode })
    });
    const data = await res.json();
    alert(data.message);
    loadRiderOrders();
}

function changeRegisterRole(){
    const role = document.getElementById("regRole").value;
    document.getElementById("merchantFields").style.display = role === "merchant" ? "block" : "none";
    document.getElementById("riderFields").style.display = role === "rider" ? "block" : "none";
}
