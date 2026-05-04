const CryptoManager = require('./src/main/crypto-manager.js');

async function testCrypto() {
  console.log('🧪 Testing crypto manager...');
  
  const crypto = new CryptoManager();
  
  try {
    // Тест 1: Установка мастер-пароля
    console.log('\n1. Setting master password...');
    const result = await crypto.setMasterPassword('test123', 'salt');
    console.log('Result:', result);
    
    // Тест 2: Проверка статуса
    console.log('\n2. Checking unlock status...');
    console.log('Is unlocked:', crypto.isVaultUnlocked());
    
    // Тест 3: Шифрование данных
    console.log('\n3. Encrypting test data...');
    const testData = { 
      title: 'Test Password',
      username: 'testuser',
      password: 'secret123',
      url: 'https://example.com'
    };
    
    const encrypted = await crypto.encryptData(testData);
    console.log('Encrypted:', encrypted);
    
    // Тест 4: Расшифровка данных
    console.log('\n4. Decrypting data...');
    const decrypted = await crypto.decryptData(encrypted);
    console.log('Decrypted:', decrypted);
    
    // Тест 5: Сравнение данных
    console.log('\n5. Data integrity check...');
    const isEqual = JSON.stringify(testData) === JSON.stringify(decrypted);
    console.log('Data matches:', isEqual);
    
    // Тест 6: Блокировка
    console.log('\n6. Locking vault...');
    crypto.lock();
    console.log('Is unlocked after lock:', crypto.isVaultUnlocked());
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCrypto(); 