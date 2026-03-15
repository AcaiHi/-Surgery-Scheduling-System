package com.backend.project.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.backend.project.Dao.UserRepository;
import com.backend.project.model.User;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

    /*-----for login-----*/

    public User authenticate(String username, String password) {
        Optional<User> optionalStaff = userRepository.findByUsername(username);
        return optionalStaff.filter(user -> user.getPassword().equals(password))
                            .orElse(null);
    }

    public User forgotPasswordAuthenticate(String username, String email) {
        Optional<User> optionalStaff = userRepository.findByUsername(username);

        return optionalStaff.filter(user -> user.getEmail().equals(email))
                            .orElse(null);
    }

    public String changePassword(String username, String newPassword) {
        Optional<User> optionalUser = userRepository.findByUsername(username);

        if (optionalUser.isPresent()) {
            User user = optionalUser.get();
            user.setPassword(newPassword);
            userRepository.save(user);
            return "Change Password successfully";
        } else {
            return "User not found";
        }
    }

    /*-----for system-----*/

    public User getUser(String username){
        return userRepository.findByUsername(username).orElseThrow();
    }

    public List<User> getAllUsers(){
        return userRepository.findAll();
    }

    public User updateUser(String username, User updatedUser) {
        return userRepository.findById(username).map(user -> {
            user.setName(updatedUser.getName());
            user.setUnit(updatedUser.getUnit());
            user.setRole(updatedUser.getRole());
            user.setEmail(updatedUser.getEmail());
            return userRepository.save(user);
        }).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User addUser(User user) {
        return userRepository.save(user);
    }

    public void addUsers(List<User> users) {
        userRepository.saveAll(users);
    }

    public void deleteUser(String username) {
        userRepository.deleteById(username);
    }

    public void deleteUsers(List<String> usernames) {
        usernames.forEach(this::deleteUser);
    }

    public String generateVerificationCode() {
        return String.format("%06d", new Random().nextInt(999999));
    }

    public void saveVerificationCode(User user, String code) {
        user.setResetPasswordCode(code);
        user.setResetPasswordExpires(LocalDateTime.now().plusMinutes(10));
        user.setResetCodeAttempts(0); // 重置嘗試次數
        userRepository.save(user);
    }

    public boolean verifyCode(User user, String inputCode) {
        String storedCode = user.getResetPasswordCode();
        LocalDateTime sentTime = user.getResetPasswordExpires();

        if (storedCode == null || sentTime == null || user.getResetCodeAttempts() >= 5) return false;

        if (Duration.between(sentTime, LocalDateTime.now()).toMinutes() > 10) return false;

        if (!storedCode.equals(inputCode)) {
            user.setResetCodeAttempts(user.getResetCodeAttempts() + 1);
            userRepository.save(user);
            return false;
        }
        // System.out.println("驗證碼應該是: " + user.getResetPasswordCode());
        // System.out.println("使用者輸入: " + inputCode);

        // 驗證成功：清除驗證碼與次數
        user.setResetPasswordCode(null);
        user.setResetPasswordExpires(null);
        user.setResetCodeAttempts(0);
        userRepository.save(user);
        return true;
    }

    public void clearVerificationCode(User user) {
        user.setResetPasswordCode(null);
        user.setResetPasswordExpires(null);
        user.setResetCodeAttempts(0);
        userRepository.save(user);
    }
}
