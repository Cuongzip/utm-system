package com.utm.backofficebff.service;

import com.utm.backofficebff.viewmodel.LoginRequestVm;
import com.utm.backofficebff.viewmodel.RefreshTokenRequestVm;
import com.utm.backofficebff.viewmodel.TokenResponseVm;

public interface AuthService {

    TokenResponseVm login(LoginRequestVm loginRequestVm);

    TokenResponseVm refreshToken(RefreshTokenRequestVm refreshTokenRequestVm);
}
