import React from 'react';
import ActionModal from '../common/ActionModal';

const DeleteAllModal = ({
    isOpen,
    onClose,
    adminPassword,
    setAdminPassword,
    saving,
    onConfirm,
    err
}) => {
    return (
        <ActionModal
            isOpen={isOpen}
            onClose={onClose}
            onConfirm={(pwd) => onConfirm(pwd)}
            title="Wipe Database"
            description="This will permanently delete EVERY STUDENT from the database. This action is irreversible."
            actionType="delete"
            loading={saving}
            error={err}
        />
    );
};

export default DeleteAllModal;
